"""Door feature engineering, ported from ``DOOR_Anomaly_Detection.ipynb``.

Pipeline: read the uploaded stream -> parse ``Datetime`` -> start a new segment
wherever the gap between consecutive rows exceeds 20 ms -> per segment build

* the 423 cycle statistics used by the first forest (notebook cell 1,
  ``signal_statistics`` / ``extract_features``), and
* the 43 door-position-band features used by the second forest (notebook
  cell 7, ``extract_position_features``).

The statistics are computed with numpy for speed but are bit-for-bit the values the
notebook's pandas calls produce (checked on every Train/Test segment), so they match
what the forests were fitted on.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from core.errors import InvalidInputError

EXPECTED_SAMPLE_MS = 20

DATETIME_COL = "Datetime"
CURRENT_COL = "Motor current(mA)"
VOLTAGE_COL = "Motor Voltage(10mV)"
EMF_COL = "Motor electrodynamic force"
POSITION_COL = "Door leaf position"

SIGNAL_COLS: tuple[str, ...] = (CURRENT_COL, VOLTAGE_COL, EMF_COL, POSITION_COL)
OPEN_COLS: tuple[str, ...] = ("Door is opening", "Open command")
CLOSE_COLS: tuple[str, ...] = ("Door is closing", "Close command")
NUMERIC_COLS: tuple[str, ...] = SIGNAL_COLS + OPEN_COLS + CLOSE_COLS
REQUIRED_COLUMNS: tuple[str, ...] = (DATETIME_COL,) + NUMERIC_COLS

POSITION_BANDS: tuple[tuple[int, int], ...] = (
    (0, 50), (50, 150), (150, 300), (300, 450), (450, 600), (600, 700),
)
BAND_SIGNALS: tuple[tuple[str, str], ...] = (
    (CURRENT_COL, "cur"), (VOLTAGE_COL, "volt"), (EMF_COL, "emf"),
)
N_QUARTERS = 4

_TIMESTAMP_PATTERN = r"\d+(?:-\d+){6}"
_TIMESTAMP_HINT = "Year-Month-Day-Hour-Minute-Second-Millisecond, e.g. 2023-7-5-0-0-3-760"
_BASE_STATS = (
    "mean", "std", "min", "max", "range", "median",
    "q05", "q25", "q75", "q95", "start", "end", "delta", "auc",
)
_PERCENTILES = (5.0, 25.0, 75.0, 95.0)
_DIFF_STATS = ("diff_mean", "diff_std", "diff_min", "diff_max", "diff_abs_mean", "diff_abs_max")

# numpy >= 2.0 names it ``trapezoid`` (what the notebook calls); older releases ``trapz``.
_trapezoid = getattr(np, "trapezoid", None) or getattr(np, "trapz")


# --------------------------------------------------------------------------- #
# Loading + validation
# --------------------------------------------------------------------------- #

def read_stream(path: Path) -> pd.DataFrame:
    """Read an uploaded door stream and validate the columns the models rely on."""
    try:
        frame = pd.read_csv(path, dtype={DATETIME_COL: str})
    except pd.errors.EmptyDataError as exc:
        raise InvalidInputError("The uploaded CSV file is empty.") from exc
    except (pd.errors.ParserError, UnicodeDecodeError, ValueError) as exc:
        raise InvalidInputError("The uploaded file could not be read as a CSV.") from exc

    frame.columns = [str(name).strip() for name in frame.columns]
    missing = [name for name in REQUIRED_COLUMNS if name not in frame.columns]
    if missing:
        raise InvalidInputError("The CSV is missing required column(s): " + ", ".join(missing) + ".")
    if frame.empty:
        raise InvalidInputError("The CSV contains a header but no data rows.")

    frame[DATETIME_COL] = frame[DATETIME_COL].astype("string").str.strip()
    for name in NUMERIC_COLS:
        frame[name] = _to_finite_numeric(frame[name], name)
    return frame


def _to_finite_numeric(series: pd.Series, name: str) -> pd.Series:
    """Coerce a sensor column to numbers; blank, text or infinite cells are rejected."""
    values = pd.to_numeric(series, errors="coerce")
    bad = ~np.isfinite(values.to_numpy(dtype=float))
    if bad.any():
        first_row = int(np.flatnonzero(bad)[0]) + 2  # +1 header, +1 for 1-based rows
        raise InvalidInputError(
            f"Column '{name}' has {int(bad.sum())} missing or non-numeric value(s) "
            f"(first at CSV line {first_row})."
        )
    return values


# --------------------------------------------------------------------------- #
# Timestamp parsing + segmentation (notebook cell 1, section 2)
# --------------------------------------------------------------------------- #

def parse_datetime(series: pd.Series) -> pd.Series:
    """Convert strings like ``2023-7-5-0-0-3-700`` (no zero padding) into Timestamps."""
    text = series.astype("string").str.strip()
    bad = ~text.str.fullmatch(_TIMESTAMP_PATTERN).fillna(False).astype(bool)
    if bad.any():
        example = series[bad].iloc[0]
        raise InvalidInputError(
            f"{int(bad.sum())} timestamp(s) in '{DATETIME_COL}' could not be parsed "
            f"(first: {example!r}). Expected {_TIMESTAMP_HINT}."
        )
    try:
        parts = text.astype(str).str.split("-", expand=True).astype(int)
        base = pd.to_datetime({
            "year": parts[0], "month": parts[1], "day": parts[2],
            "hour": parts[3], "minute": parts[4], "second": parts[5],
        })
        return base + pd.to_timedelta(parts[6], unit="ms")
    except (ValueError, OverflowError) as exc:  # e.g. month 13, day 32
        raise InvalidInputError(
            f"'{DATETIME_COL}' contains an impossible date or time. Expected {_TIMESTAMP_HINT}."
        ) from exc


def add_segments(df: pd.DataFrame, expected_ms: int = EXPECTED_SAMPLE_MS) -> pd.DataFrame:
    """Add ``_segment_num``: a new segment starts whenever the time gap is > ``expected_ms``."""
    out = df.copy()
    out["_timestamp"] = parse_datetime(out[DATETIME_COL])
    out["_gap_ms"] = out["_timestamp"].diff().dt.total_seconds().mul(1000)
    out["_segment_num"] = out["_gap_ms"].fillna(expected_ms).gt(expected_ms).cumsum()
    return out


def split_segments(segmented: pd.DataFrame) -> list[pd.DataFrame]:
    """Return one frame per segment, in stream order, each with a fresh 0..n-1 index."""
    ids = segmented["_segment_num"].to_numpy()
    if len(ids) == 0:
        return []
    starts = np.concatenate(([0], np.flatnonzero(np.diff(ids) != 0) + 1))
    stops = np.concatenate((starts[1:], [len(ids)]))
    return [
        segmented.iloc[start:stop].reset_index(drop=True)
        for start, stop in zip(starts.tolist(), stops.tolist())
    ]


def segment_stream(df: pd.DataFrame) -> list[pd.DataFrame]:
    """Gap-based segmentation of a raw stream into individual door cycles."""
    return split_segments(add_segments(df))


# --------------------------------------------------------------------------- #
# Open / Close (notebook cell 1, section 3)
# --------------------------------------------------------------------------- #

def infer_operation(segment: pd.DataFrame) -> str:
    """Infer Open/Close from the command/state columns."""
    open_score = segment[OPEN_COLS[0]].sum() + segment[OPEN_COLS[1]].sum()
    close_score = segment[CLOSE_COLS[0]].sum() + segment[CLOSE_COLS[1]].sum()
    return "Open" if open_score > close_score else "Close"


def segment_metadata(segments: list[pd.DataFrame]) -> pd.DataFrame:
    """Boundaries (original timestamp strings), operation and row count per segment."""
    return pd.DataFrame(
        [
            {
                "start_time": str(g[DATETIME_COL].iloc[0]),
                "end_time": str(g[DATETIME_COL].iloc[-1]),
                "operation": infer_operation(g),
                "n_rows": len(g),
            }
            for g in segments
        ],
        columns=["start_time", "end_time", "operation", "n_rows"],
    )


# --------------------------------------------------------------------------- #
# Cycle statistics for the first forest (notebook cell 1, section 4)
# --------------------------------------------------------------------------- #

def _sample_std(values: np.ndarray) -> float:
    """Sample standard deviation through pandas, as in the notebook.

    pandas may route ``std`` through bottleneck, whose summation order differs from
    ``numpy.std`` in the last bits; every other statistic below is bit-identical
    between numpy and pandas, so only this one needs the pandas call.
    """
    return float(pd.Series(values).std())


def signal_statistics(x, prefix: str) -> dict[str, float]:
    """Summarise one finite signal into 20 features (notebook ``signal_statistics``).

    numpy is used instead of per-call pandas Series methods for speed; the values are
    bit-for-bit those of the notebook (mean = sum/n, linear-interpolated percentiles,
    median, trapezoid area, first differences). Input must be NaN-free, which
    ``read_stream`` guarantees.

    The notebook omits the ``diff_*`` keys when the signal has fewer than two samples
    and later zero-fills them (``reindex(fill_value=0)`` / ``fillna(0)``). Emitting NaN
    here ends in the same zeros while keeping the column set fixed. The notebook cannot
    handle an empty signal at all (``iloc[0]`` fails); that case yields all-NaN, i.e.
    zeros after cleaning.
    """
    x = np.asarray(x, dtype=float)
    result = {f"{prefix}_{stat}": np.nan for stat in _BASE_STATS + _DIFF_STATS}
    if x.size == 0:
        return result
    q05, q25, q75, q95 = np.percentile(x, _PERCENTILES)

    result[f"{prefix}_mean"] = x.sum() / x.size
    result[f"{prefix}_std"] = _sample_std(x)
    result[f"{prefix}_min"] = x.min()
    result[f"{prefix}_max"] = x.max()
    result[f"{prefix}_range"] = x.max() - x.min()

    result[f"{prefix}_median"] = np.median(x)
    result[f"{prefix}_q05"] = q05
    result[f"{prefix}_q25"] = q25
    result[f"{prefix}_q75"] = q75
    result[f"{prefix}_q95"] = q95

    result[f"{prefix}_start"] = x[0]
    result[f"{prefix}_end"] = x[-1]
    result[f"{prefix}_delta"] = x[-1] - x[0]

    # Area under the signal curve in sample units.
    result[f"{prefix}_auc"] = _trapezoid(x)

    dx = np.diff(x)
    if dx.size > 0:
        abs_dx = np.abs(dx)
        result[f"{prefix}_diff_mean"] = dx.sum() / dx.size
        result[f"{prefix}_diff_std"] = _sample_std(dx)
        result[f"{prefix}_diff_min"] = dx.min()
        result[f"{prefix}_diff_max"] = dx.max()
        result[f"{prefix}_diff_abs_mean"] = abs_dx.sum() / abs_dx.size
        result[f"{prefix}_diff_abs_max"] = abs_dx.max()
    return result


def _cycle_statistics_row(g: pd.DataFrame) -> dict[str, float]:
    """Whole-cycle + quarter-cycle statistics and the effort/movement ratio for one segment."""
    row: dict[str, float] = {
        "n_rows": len(g),
        "duration_s": (len(g) - 1) * EXPECTED_SAMPLE_MS / 1000,
        "operation_open": int(infer_operation(g) == "Open"),
    }
    for col in SIGNAL_COLS:
        values = g[col].to_numpy(dtype=float)
        row.update(signal_statistics(values, col))
        for quarter, chunk in enumerate(np.array_split(values, N_QUARTERS), start=1):
            row.update(signal_statistics(chunk, f"{col}_Q{quarter}"))

    # Motor effort per unit of movement: high current + little movement suggests resistance.
    current = g[CURRENT_COL].to_numpy(dtype=float)
    position_change = np.abs(np.diff(g[POSITION_COL].to_numpy(dtype=float)))
    row.update(signal_statistics(current[1:] / (position_change + 1.0), "current_per_position_change"))
    return row


def statistical_features(segments: list[pd.DataFrame]) -> pd.DataFrame:
    """One row per segment: the 423 cycle statistics (notebook ``extract_features``)."""
    return pd.DataFrame([_cycle_statistics_row(g) for g in segments])


# --------------------------------------------------------------------------- #
# Door-position-band features for the second forest (notebook cell 7)
# --------------------------------------------------------------------------- #

def _position_band_row(g: pd.DataFrame) -> dict[str, float]:
    pos = g[POSITION_COL].to_numpy(dtype=float)
    row: dict[str, float] = {"operation_open": int(infer_operation(g) == "Open")}
    for lo, hi in POSITION_BANDS:
        in_band = (pos >= lo) & (pos < hi)
        occupied = bool(in_band.any())
        for col, tag in BAND_SIGNALS:
            v = g[col].to_numpy(dtype=float)[in_band]
            row[f"{tag}_{lo}_{hi}_mean"] = v.mean() if occupied else 0.0
            row[f"{tag}_{lo}_{hi}_max"] = v.max() if occupied else 0.0
        row[f"dwell_{lo}_{hi}"] = in_band.sum() * EXPECTED_SAMPLE_MS / 1000
    return row


def position_features(segments: list[pd.DataFrame]) -> pd.DataFrame:
    """One row per segment: features measured inside fixed door-position bands."""
    return pd.DataFrame([_position_band_row(g) for g in segments])

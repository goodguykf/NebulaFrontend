"""Rail corrugation features, computed straight from one uploaded CSV recording.

Port of ``Rail_Training_v2_Model_Zoo.ipynb``:

* cell 8  -> ``read_recording``, ``estimate_speed``, ``sensor_descriptors``
* cell 10 -> ``channel_index``
* cell 12 -> ``peak_stats``, ``side_features``, ``pair_features`` (the notebook's ``build_pair``)

The arithmetic (expressions, dtypes, float32 storage of the per-sensor descriptors) is kept
identical to the notebook on purpose: the regression tests require the notebook's
probabilities to be reproduced, so do not "tidy" the numerical expressions.

Recording layout: 129 named columns, 10 kHz, 1 s. Column 1 is the speed-wheel pulse train,
columns 2-129 are ``Vibration`` / ``Shock`` for positions 1-8 of cars 1-8. Sensor channel
index = ``car*16 + (position-1)*2 + {0: vibration, 1: shock}``; positions 1/3/5/7 are Side I
and positions 2/4/6/8 are Side II, i.e. 32 sensors per side and measurement.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Sequence

import numpy as np
import pandas as pd
from scipy.signal import welch
from scipy.stats import kurtosis

from core.errors import InferenceError, InvalidInputError

logger = logging.getLogger(__name__)

N_COLUMNS = 129
N_CARS = 8
N_POSITIONS = 8
MEASUREMENTS: tuple[tuple[int, str, str], ...] = ((0, "vib", "Vibration"), (1, "shk", "Shock"))
SIDE_POSITIONS: Mapping[str, tuple[int, ...]] = {"I": (0, 2, 4, 6), "II": (1, 3, 5, 7)}
SENSORS_PER_SIDE = N_CARS * 4
SPEED_COLUMN = "Rotating speed"

# Time-domain statistics that feed the model (notebook ``TSTAT_USE``). The notebook's cache also
# stored skew / p95 / std / mean / zcr, which no feature uses, so they are not computed here.
TSTAT_NAMES: tuple[str, ...] = ("rms", "peak", "crest", "kurt", "p99", "env_std", "rms_hp", "kurt_hp")
LOG_TSTATS = frozenset({"rms", "peak", "p99", "env_std", "rms_hp"})
PEAK_DESCRIPTORS: tuple[str, ...] = ("peak_ratio", "tonal", "prom")

WELCH_NPERSEG = 1024
WELCH_NOVERLAP = 512
HIGH_PASS_HZ = 300
PERIODOGRAM_BINS = 2501  # 1-Hz bins, 0-2500 Hz
MIN_KNOWN_SPEED = 1.0  # m/s; below this the recording is treated as "speed unknown"
_BATCH_ROWS = 2  # see _as_notebook_batch


@dataclass(frozen=True)
class FeatureSettings:
    """Physical constants and band edges; defaults are the notebook's, metadata.json overrides."""

    fs: int = 10_000
    wheel_diameter: float = 0.85
    n_teeth: int = 90
    band_edges: tuple[float, ...] = (20, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 5000)
    wl_edges: tuple[float, ...] = (0.03, 0.05, 0.08, 0.12, 0.20, 0.30, 0.50, 0.80)

    @classmethod
    def from_metadata(cls, metadata: Mapping[str, Any]) -> "FeatureSettings":
        default = cls()
        return cls(
            fs=metadata.get("fs", default.fs),
            wheel_diameter=metadata.get("wheel_diameter", default.wheel_diameter),
            n_teeth=metadata.get("n_teeth", default.n_teeth),
            band_edges=tuple(metadata.get("band_edges", default.band_edges)),
            wl_edges=tuple(metadata.get("wl_edges", default.wl_edges)),
        )


@dataclass(frozen=True)
class SensorDescriptors:
    """Per-sensor summary of one recording (one row of the notebook's ``rail_cache``)."""

    speed: float  # m/s, 0.0 when the pulse train is flat
    tstats: np.ndarray  # (128, len(TSTAT_NAMES)) float32
    welch: np.ndarray  # (128, 513) float32 Welch PSD
    perio: np.ndarray  # (128, 2501) float32 1-Hz periodogram


@dataclass(frozen=True)
class SensorBatch:
    """Descriptors of N recordings stacked on a leading axis (the notebook's cache layout)."""

    speed: np.ndarray  # (N,) float64
    tstats: np.ndarray  # (N, 128, len(TSTAT_NAMES))
    welch: np.ndarray  # (N, 128, 513)
    perio: np.ndarray  # (N, 128, 2501)


# --------------------------------------------------------------------------- CSV loading


def expected_columns() -> list[str]:
    """Header names in sensor-channel order (speed first)."""
    return [SPEED_COLUMN] + [
        f"{label} of bearing in position {position} of car {car}"
        for car in range(1, N_CARS + 1)
        for position in range(1, N_POSITIONS + 1)
        for _, _, label in MEASUREMENTS
    ]


def _invalid(name: str, reason: str) -> InvalidInputError:
    return InvalidInputError(f"Invalid Rail CSV '{name}': {reason}")


def read_recording(path: Path, name: str, settings: FeatureSettings) -> tuple[np.ndarray, np.ndarray]:
    """Return ``(speed pulses (n,), sensor signals (n, 128))`` as float32, validated."""
    try:
        frame = pd.read_csv(path)
    except pd.errors.EmptyDataError as exc:
        raise _invalid(name, "the file is empty.") from exc
    except (pd.errors.ParserError, UnicodeDecodeError, ValueError, OSError) as exc:
        raise _invalid(name, "the file could not be read as CSV.") from exc

    if frame.shape[1] != N_COLUMNS:
        raise _invalid(name, f"expected {N_COLUMNS} columns but received {frame.shape[1]}.")
    lookup = {str(column).strip().casefold(): column for column in frame.columns}
    ordered = expected_columns()
    missing = [column for column in ordered if column.casefold() not in lookup]
    if missing:
        raise _invalid(
            name,
            f"unexpected column headers ({len(missing)} of {N_COLUMNS} expected names are missing, "
            f"e.g. '{missing[0]}').",
        )
    if frame.empty:
        raise _invalid(name, "the file contains a header but no samples.")
    try:
        values = frame[[lookup[column.casefold()] for column in ordered]].to_numpy(np.float32)
    except (ValueError, TypeError) as exc:
        raise _invalid(name, "all readings must be numeric.") from exc
    if not np.isfinite(values).all():
        raise _invalid(name, "the file contains missing or non-finite readings.")
    if len(values) < settings.fs:
        raise _invalid(
            name,
            f"recording too short for spectral analysis: expected {settings.fs} samples "
            f"(1 s at {settings.fs} Hz) but received {len(values)}.",
        )
    if len(values) > settings.fs:
        # The models were trained on 1-s recordings and the periodogram assumes 1-Hz bins.
        logger.warning("Rail CSV '%s' has %d samples; analysing the first %d.", name, len(values), settings.fs)
        values = values[: settings.fs]
    return values[:, 0], values[:, 1:]


# --------------------------------------------------------------------------- per-sensor descriptors


def estimate_speed(pulses: np.ndarray, settings: FeatureSettings) -> float:
    """Train speed in m/s from the toothed-wheel pulse train (0.0 if there are no pulses)."""
    lo, hi = pulses.min(), pulses.max()
    if hi - lo < 1e-8:
        return 0.0
    high = pulses > (lo + hi) / 2
    edges = np.flatnonzero((~high[:-1]) & high[1:]) + 1
    if len(edges) < 2:
        return 0.0
    return float(settings.fs / np.median(np.diff(edges)) * np.pi * settings.wheel_diameter / settings.n_teeth)


def _time_statistics(xc: np.ndarray, settings: FeatureSettings) -> np.ndarray:
    """(128, len(TSTAT_NAMES)) float32 statistics of the mean-removed signals ``xc``."""
    rms = np.sqrt((xc**2).mean(0))
    peak = np.abs(xc).max(0)
    freqs = np.fft.rfftfreq(len(xc), 1 / settings.fs)
    # .copy() is load-bearing: rfft(axis=0) returns an F-ordered array and the C-ordered copy makes
    # the float32 irfft round exactly as in the notebook (rms_hp / kurt_hp differ by ~1e-5 otherwise).
    spectrum = np.fft.rfft(xc, axis=0).copy()
    spectrum[freqs < HIGH_PASS_HZ] = 0
    xh = np.fft.irfft(spectrum, n=len(xc), axis=0)  # > 300 Hz part
    stats = {
        "rms": rms,
        "peak": peak,
        "crest": peak / (rms + 1e-9),
        "kurt": kurtosis(xc, axis=0, fisher=False),
        "p99": np.percentile(np.abs(xc), 99, axis=0),
        "env_std": np.abs(xc).std(0),
        "rms_hp": np.sqrt((xh**2).mean(0)),
        "kurt_hp": kurtosis(xh, axis=0, fisher=False),
    }
    return np.stack([stats[n] for n in TSTAT_NAMES], 1).astype(np.float32)


def sensor_descriptors(path: Path, name: str, settings: FeatureSettings) -> SensorDescriptors:
    """Speed, time statistics, Welch PSD and 1-Hz periodogram of all 128 sensor channels."""
    pulses, x = read_recording(path, name, settings)
    speed = estimate_speed(pulses, settings)
    xc = x - x.mean(0, keepdims=True)
    tstats = _time_statistics(xc, settings)
    _, psd = welch(xc, fs=settings.fs, window="hann", nperseg=WELCH_NPERSEG, noverlap=WELCH_NOVERLAP, axis=0)
    window = np.hanning(len(xc))[:, None]
    perio = np.abs(np.fft.rfft(xc * window, axis=0)) ** 2 / (window**2).sum() / settings.fs
    return SensorDescriptors(
        speed=speed,
        tstats=tstats,
        welch=psd.T.astype(np.float32),
        perio=perio[:PERIODOGRAM_BINS].T.astype(np.float32),
    )


# --------------------------------------------------------------------------- side features


def channel_index(side: str, meas: int) -> np.ndarray:
    """Indices of the 32 sensors of ``side`` ('I' or 'II') for vibration (0) or shock (1)."""
    return np.array([car * 16 + p * 2 + meas for car in range(N_CARS) for p in SIDE_POSITIONS[side]])


def peak_stats(P: np.ndarray, lo: int = 20, hi: int = 1000) -> dict[str, np.ndarray]:
    """Tonal-peak descriptors of 1-Hz periodograms ``P`` (rows = spectra) within ``lo..hi`` Hz."""
    f = np.arange(P.shape[-1], dtype=float)
    m = (f >= lo) & (f <= hi)
    Pm = P[:, m]
    fm = f[m]
    Ps = np.apply_along_axis(lambda r: np.convolve(r, np.ones(3) / 3, "same"), 1, Pm)
    med = np.median(Ps, 1) + 1e-12
    imax = Ps.argmax(1)
    pk = Ps.max(1)
    idx = np.arange(Pm.shape[1])[None, :]
    d = np.abs(idx - imax[:, None])
    tonal = (Pm * (d <= 3)).sum(1) / (Pm.sum(1) + 1e-12)
    ring = (d <= 30) & (d > 4)
    prom = pk / ((Ps * ring).sum(1) / np.maximum(ring.sum(1), 1) + 1e-12)
    return dict(peak_ratio=np.log(pk / med), tonal=tonal, prom=np.log(prom), fpk=fm[imax])


def _aggregate(out: dict[str, np.ndarray], name: str, a: np.ndarray) -> None:
    """Summarise per-sensor values ``a`` (N, 32) across the sensors of one side."""
    s = np.sort(a, 1)
    out[f"{name}_mean"] = a.mean(1)
    out[f"{name}_max"] = s[:, -1]
    out[f"{name}_top4"] = s[:, -4:].mean(1)
    out[f"{name}_std"] = a.std(1)
    out[f"{name}_p25"] = s[:, 8]


def side_features(
    batch: SensorBatch, side: str, meas: int, tag: str, settings: FeatureSettings
) -> dict[str, np.ndarray]:
    """Notebook ``side_features``: ``{tag}_...`` -> (N,) values for one side and one measurement."""
    ch = channel_index(side, meas)
    v = batch.speed
    N = len(v)
    ts, W, P = batch.tstats[:, ch, :], batch.welch[:, ch, :], batch.perio[:, ch, :]
    fw = np.fft.rfftfreq(WELCH_NPERSEG, 1 / settings.fs)
    out: dict[str, np.ndarray] = {}

    for j, nm in enumerate(TSTAT_NAMES):
        a = ts[:, :, j]
        _aggregate(out, f"{tag}_{nm}", np.log(a + 1e-6) if nm in LOG_TSTATS else a)

    edges = settings.band_edges
    tot = W[:, :, (fw >= 20) & (fw < 5000)].sum(-1) + 1e-12
    for lo, hi in zip(edges[:-1], edges[1:]):
        bp = W[:, :, (fw >= lo) & (fw < hi)].sum(-1)
        _aggregate(out, f"{tag}_lb_{lo}_{hi}", np.log(bp + 1e-12))
        _aggregate(out, f"{tag}_rb_{lo}_{hi}", bp / tot)

    Wm = W.mean(1)
    mm = (fw >= 20) & (fw <= 2000)
    pm = Wm[:, mm] / (Wm[:, mm].sum(1, keepdims=True) + 1e-12)
    out[f"{tag}_centroid"] = (pm * fw[mm]).sum(1) / 2000
    out[f"{tag}_entropy"] = -(pm * np.log(pm + 1e-12)).sum(1) / np.log(pm.shape[1])
    out[f"{tag}_flatness"] = np.exp(np.log(Wm[:, mm] + 1e-12).mean(1)) / (Wm[:, mm].mean(1) + 1e-12)

    pk = peak_stats(P.reshape(-1, P.shape[-1]))
    for nm in PEAK_DESCRIPTORS:
        _aggregate(out, f"{tag}_{nm}", pk[nm].reshape(N, SENSORS_PER_SIDE))
    fpk = pk["fpk"].reshape(N, SENSORS_PER_SIDE)
    fmed = np.median(fpk, 1, keepdims=True)
    out[f"{tag}_peak_agree"] = (np.abs(fpk - fmed) <= 0.05 * fmed + 2).mean(1)

    pkm = peak_stats(P.mean(1))
    out[f"{tag}_mean_peak_ratio"] = pkm["peak_ratio"]
    out[f"{tag}_mean_tonal"] = pkm["tonal"]
    out[f"{tag}_mean_prom"] = pkm["prom"]
    out[f"{tag}_mean_fpk"] = pkm["fpk"] / 1000

    Pm = P.mean(1)
    fp = np.arange(P.shape[-1], dtype=float)
    tot_p = Pm[:, 20:1001].sum(1) + 1e-12
    for lo, hi in zip(settings.wl_edges[:-1], settings.wl_edges[1:]):
        val = np.zeros(N)
        for i in range(N):
            if v[i] > MIN_KNOWN_SPEED:
                sel = (fp >= max(v[i] / hi, 20)) & (fp < min(v[i] / lo, 1000))
                val[i] = Pm[i, sel].sum() / tot_p[i]
        out[f"{tag}_wl_{lo:g}_{hi:g}"] = val
    out[f"{tag}_peak_wavelength"] = np.clip(
        np.where(v > MIN_KNOWN_SPEED, v / np.maximum(pkm["fpk"], 1), 0.0), 0, 2
    )
    return out


def _pair_columns(
    first: Mapping[str, np.ndarray], second: Mapping[str, np.ndarray], v: np.ndarray
) -> dict[str, np.ndarray]:
    """Notebook ``build_pair`` columns for the ordered side pair (A = first, B = second)."""
    columns = {f"A_{k}": a for k, a in first.items()}
    columns.update({f"B_{k}": b for k, b in second.items()})
    columns.update({f"D_{k}": first[k] - second[k] for k in first})
    columns["speed"] = v / 20.0
    columns["speed_known"] = (v > MIN_KNOWN_SPEED).astype(float)
    return columns


def _select(columns: Mapping[str, np.ndarray], feature_names: Sequence[str], name: str) -> np.ndarray:
    """First batch row of the requested columns as one float32 feature vector."""
    unknown = [n for n in feature_names if n not in columns]
    if unknown:
        raise InferenceError(f"Rail model expects unknown feature '{unknown[0]}' (metadata.json mismatch).")
    row = np.array([columns[n][0] for n in feature_names]).astype(np.float32)
    if not np.isfinite(row).all():
        raise InferenceError(f"Rail feature extraction produced non-finite values for '{name}'.")
    return row


def _as_notebook_batch(desc: SensorDescriptors) -> SensorBatch:
    """The recording stacked ``_BATCH_ROWS`` times, shaped like the notebook's cache arrays.

    The notebook built features for a whole folder at once. Its ``cache[...][:, ch, :]`` arrays
    are not C-ordered, so NumPy sums the 32 sensors sequentially for any batch of two or more
    recordings but pairwise for a single one, which changes float32 means / stds in the last
    bit. Running the same batched code on a 2-row batch makes every file's features
    bit-identical to the notebook's, however many files are uploaded together.
    """
    return SensorBatch(
        speed=np.array([desc.speed] * _BATCH_ROWS),
        tstats=np.stack([desc.tstats] * _BATCH_ROWS),
        welch=np.stack([desc.welch] * _BATCH_ROWS),
        perio=np.stack([desc.perio] * _BATCH_ROWS),
    )


def pair_features(
    desc: SensorDescriptors, feature_names: Sequence[str], settings: FeatureSettings, name: str = "recording"
) -> tuple[np.ndarray, np.ndarray]:
    """Feature rows ``(natural, swapped)``, each aligned to ``feature_names``.

    ``natural`` is the notebook's ``build_pair(c, 'I', 'II')``; ``swapped`` is
    ``build_pair(c, 'II', 'I')``, used for the test-time side-swap average. Side features do not
    depend on the orientation, so each side is computed once and only relabelled.
    """
    batch = _as_notebook_batch(desc)
    sides: dict[str, dict[str, np.ndarray]] = {"I": {}, "II": {}}
    for side, feats in sides.items():
        for meas, tag, _ in MEASUREMENTS:
            feats.update(side_features(batch, side, meas, tag, settings))
    natural = _select(_pair_columns(sides["I"], sides["II"], batch.speed), feature_names, name)
    swapped = _select(_pair_columns(sides["II"], sides["I"], batch.speed), feature_names, name)
    return natural, swapped


def extract_features(
    path: Path, name: str, feature_names: Sequence[str], settings: FeatureSettings
) -> tuple[np.ndarray, np.ndarray]:
    """CSV on disk -> ``(natural, swapped)`` float32 feature rows in ``feature_names`` order."""
    return pair_features(sensor_descriptors(path, name, settings), feature_names, settings, name)

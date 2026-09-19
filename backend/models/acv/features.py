"""ACV case-workbook parsing and per-car, peer-relative feature extraction.

Port of the final scorer's feature code in ``ACV_Fault_Localisation_Final_End_to_End.ipynb``:

* ``load_case`` / ``get_car_parameter``          (cells 6, 17)  -> :func:`load_case`, :func:`car_series`
* ``calculate_cooling_error``                    (cell 25)      -> :func:`cooling_panels`
* ``peer_panel`` / ``robust_car_features``       (cell 95)      -> :func:`peer_relative_features`
* ``verification_features`` (same-setpoint part) (cell 100)     -> :func:`same_setpoint_features`

Every feature is computed on *valid active-cooling* rows only and is expressed relative to
the train median at the same timestamp, so ambient conditions and train-wide control
changes cancel out. Cars are discovered from the workbook's own ``Car <NN> - <parameter>``
headers and keep the identifier exactly as written there.
"""

from __future__ import annotations

import logging
import re
import zipfile
from collections.abc import Iterator
from pathlib import Path
from typing import IO, NamedTuple
from xml.etree import ElementTree

import numpy as np
import pandas as pd

from core.errors import InvalidInputError

logger = logging.getLogger(__name__)

CAR_COLUMN_PATTERN = re.compile(r"^Car (\w+) - (.+)$")

# Accepted header names per signal. The first name is the one used by the notebook (the
# 8-parameter schema of the test file); later names are the equivalents in the rich
# 60+-parameter schema (training Case 04, notebook Section 21.1 mapping).
PARAMETER_ALIASES: dict[str, tuple[str, ...]] = {
    "indoor": ("Indoor Average Temperature", "Passenger Cabin Temperature Detected Value"),
    "setpoint": ("ACV Control Temperature (Cooling)", "Target Temperature Value"),
    "running_mode": ("ACV Running Mode",),
    "info_valid": ("ACV Information Valid",),
    "outdoor": (
        "Outdoor Average Temperature",
        "Outside Temperature Sensor Reading",
        "Fresh Air Temperature Detected Value",
    ),
}
REQUIRED_SIGNALS: dict[str, str] = {
    "indoor": "indoor temperature",
    "setpoint": "cooling setpoint",
    "running_mode": "running mode",
}

COOLING_MODES = frozenset({"Automatic Cooling", "Full Cooling", "Half Cooling"})
INDOOR_RANGE_C = (10.0, 45.0)
SETPOINT_RANGE_C = (10.0, 35.0)

MIN_COOLING_CARS = 3  # a timestamp is comparable only if at least this many cars are cooling ...
MIN_COOLING_SHARE = 0.6  # ... and at least this share of the cars that have any cooling data
SAME_SETPOINT_MIN_CARS = 5  # notebook cell 100: rows used for the same-setpoint comparison
SAME_SETPOINT_TOLERANCE_K = 0.01
WARM_EXCESS_K = 1.0  # "more than 1 K above the peers"
HOT_QUANTILE = 0.67  # hottest third of the record, by train-median outdoor temperature

PEER_FEATURES = ["dE_mean", "dT_mean", "dE_pos_area", "dE_frac_gt1"]
SAME_SETPOINT_FEATURES = ["excess_same_setpoint_K", "excess_same_setpoint_hot_K"]
FEATURE_COLUMNS = PEER_FEATURES + SAME_SETPOINT_FEATURES

CarLayout = dict[str, dict[str, str]]  # car id -> {parameter name -> workbook column}


class CoolingPanels(NamedTuple):
    """Time x car tables, already restricted to each car's valid active-cooling rows."""

    indoor: pd.DataFrame
    setpoint: pd.DataFrame
    cooling_error: pd.DataFrame
    outdoor: pd.Series  # train-median outdoor temperature (not masked, as in the notebook)


# --------------------------------------------------------------------------------------
# Car discovery
# --------------------------------------------------------------------------------------


def _car_sort_key(car: str) -> tuple[int, int, str]:
    return (0, int(car), car) if car.isdigit() else (1, 0, car)


def discover_cars(columns: list[str]) -> CarLayout:
    """Map every car found in the headers to its ``{parameter: column}`` table, cars in ascending order."""
    layout: CarLayout = {}
    for column in columns:
        match = CAR_COLUMN_PATTERN.match(str(column).strip())
        if match:
            car, parameter = match.groups()
            layout.setdefault(car, {}).setdefault(parameter.strip(), column)
    return {car: layout[car] for car in sorted(layout, key=_car_sort_key)}


def _signal_column(layout: CarLayout, car: str, signal: str) -> str | None:
    """First workbook column of ``car`` that matches one of the accepted names for ``signal``."""
    for parameter in PARAMETER_ALIASES[signal]:
        column = layout[car].get(parameter)
        if column is not None:
            return column
    return None


def _used_columns(layout: CarLayout) -> list[str]:
    columns = (_signal_column(layout, car, signal) for car in layout for signal in PARAMETER_ALIASES)
    return [column for column in columns if column is not None]


def validate_layout(layout: CarLayout) -> None:
    """Raise :class:`InvalidInputError` unless the headers contain what the scorer needs."""
    if not layout:
        raise InvalidInputError(
            "Invalid ACV workbook: no per-car columns named 'Car <NN> - <parameter>' were found."
        )
    missing = [
        label
        for signal, label in REQUIRED_SIGNALS.items()
        if all(_signal_column(layout, car, signal) is None for car in layout)
    ]
    if missing:
        raise InvalidInputError(
            f"Invalid ACV workbook: no per-car {', '.join(missing)} columns were found "
            "(expected e.g. 'Car 01 - Indoor Average Temperature', "
            "'Car 01 - ACV Control Temperature (Cooling)', 'Car 01 - ACV Running Mode')."
        )


# --------------------------------------------------------------------------------------
# Workbook loading
# --------------------------------------------------------------------------------------
# The case files store every text cell as an inline string, which openpyxl parses very
# slowly (10-20 s for a 2 MB file, minutes for the rich-schema file). The scorer needs only
# ~5 columns per car and no dates, so those cells are read straight from the sheet XML.
# Anything this reader does not understand falls back to pandas/openpyxl (the notebook's loader).

_MAIN_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
_DOC_REL_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def _first_sheet_member(archive: zipfile.ZipFile) -> str:
    """Archive member of the first worksheet (the sheet ``pandas.read_excel`` reads by default)."""
    workbook = ElementTree.fromstring(archive.read("xl/workbook.xml"))
    sheet = workbook.find(f"{_MAIN_NS}sheets/{_MAIN_NS}sheet")
    relation_id = sheet.get(f"{_DOC_REL_NS}id")
    relations = ElementTree.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    target = next(rel.get("Target") for rel in relations if rel.get("Id") == relation_id)
    return target.lstrip("/") if target.startswith("/") else f"xl/{target}"


def _rich_text(node: ElementTree.Element) -> str:
    """Text of an ``<is>``/``<si>`` node: plain ``<t>`` plus formatted runs (phonetic runs ignored)."""
    parts = [t.text or "" for t in node.findall(f"{_MAIN_NS}t")]
    parts += [t.text or "" for run in node.findall(f"{_MAIN_NS}r") for t in run.findall(f"{_MAIN_NS}t")]
    return "".join(parts)


def _shared_strings(archive: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
    return [_rich_text(item) for item in root.findall(f"{_MAIN_NS}si")]


def _cell_value(cell: ElementTree.Element, shared: list[str]) -> float | str | bool | None:
    kind = cell.get("t", "n")
    if kind == "inlineStr":
        node = cell.find(f"{_MAIN_NS}is")
        return _rich_text(node) if node is not None else None
    raw = cell.findtext(f"{_MAIN_NS}v")
    if raw is None or kind == "e":
        return None
    if kind == "n":
        return float(raw)
    if kind == "s":
        return shared[int(raw)]
    if kind == "b":
        return raw == "1"
    return raw  # formula string or ISO date text


def _column_index(letters: str) -> int:
    index = 0
    for letter in letters:
        index = index * 26 + (ord(letter) - 64)
    return index - 1


def _reference_position(reference: str | None, index_of: dict[str, int]) -> int:
    """Zero-based column of a cell reference such as ``AB12``; -1 when the cell carries none."""
    if not reference:
        return -1
    letters = reference.rstrip("0123456789").upper()
    position = index_of.get(letters)
    if position is None:
        position = index_of[letters] = _column_index(letters)
    return position


def _cells_by_position(row: ElementTree.Element, index_of: dict[str, int]) -> dict[int, ElementTree.Element]:
    """All cells of a row keyed by column; cells without a reference follow their left neighbour."""
    cells: dict[int, ElementTree.Element] = {}
    position = -1
    for cell in row:
        referenced = _reference_position(cell.get("r"), index_of)
        position = referenced if referenced >= 0 else position + 1
        cells[position] = cell
    return cells


def _iter_rows(stream: IO[bytes]) -> Iterator[ElementTree.Element]:
    """Yield every ``<row>`` element of a sheet, releasing its cells once the caller is done with it."""
    row_tag = f"{_MAIN_NS}row"
    for _, element in ElementTree.iterparse(stream, events=("end",)):
        if element.tag == row_tag:
            yield element
            element.clear()


def _load_case_streaming(path: Path) -> tuple[pd.DataFrame, CarLayout]:
    index_of: dict[str, int] = {}
    with zipfile.ZipFile(path) as archive:
        shared = _shared_strings(archive)
        with archive.open(_first_sheet_member(archive)) as stream:
            rows = _iter_rows(stream)
            header: dict[str, int] = {}
            for position, cell in _cells_by_position(next(rows), index_of).items():
                value = _cell_value(cell, shared)
                if value is not None:
                    header.setdefault(str(value), position)
            layout = discover_cars(list(header))
            validate_layout(layout)
            wanted = [(header[name], name) for name in _used_columns(layout)]
            columns: dict[str, list] = {name: [] for _, name in wanted}
            for row in rows:
                width, cells = len(row), None
                for position, name in wanted:
                    # Dense rows (the normal case) are indexed directly; sparse rows are scanned once.
                    cell = row[position] if position < width else None
                    if cell is None or _reference_position(cell.get("r"), index_of) != position:
                        if cells is None:
                            cells = _cells_by_position(row, index_of)
                        cell = cells.get(position)
                    columns[name].append(None if cell is None else _cell_value(cell, shared))
    return pd.DataFrame(columns, dtype=object), layout


def _load_case_pandas(path: Path) -> tuple[pd.DataFrame, CarLayout]:
    """The notebook's loader (``pd.read_excel`` with openpyxl), restricted to the used columns."""
    frame = pd.read_excel(path, engine="openpyxl")
    layout = discover_cars(list(frame.columns))
    validate_layout(layout)
    return frame[_used_columns(layout)], layout


def load_case(path: Path) -> tuple[pd.DataFrame, CarLayout]:
    """Read one ACV case workbook; return the telemetry columns the scorer uses and the car layout."""
    path = Path(path)
    if not path.is_file():
        raise InvalidInputError("Invalid ACV workbook: the file does not exist.")
    try:
        try:
            frame, layout = _load_case_streaming(path)
        except InvalidInputError:
            raise
        except Exception as exc:  # noqa: BLE001 - unusual workbook layout: use the reference loader
            logger.info("streaming ACV reader not applicable to %s (%r); using openpyxl", path.name, exc)
            frame, layout = _load_case_pandas(path)
    except InvalidInputError:
        raise
    except Exception as exc:  # noqa: BLE001 - corrupt or non-xlsx upload
        logger.info("unreadable ACV workbook %s: %r", path.name, exc)
        raise InvalidInputError(
            "Invalid ACV workbook: the file could not be read as an .xlsx workbook."
        ) from exc
    if frame.empty:
        raise InvalidInputError("Invalid ACV workbook: the sheet contains no data rows.")
    return frame, layout


# --------------------------------------------------------------------------------------
# Valid active-cooling rows
# --------------------------------------------------------------------------------------


def car_series(frame: pd.DataFrame, layout: CarLayout, car: str, signal: str) -> pd.Series:
    """The car's series for ``signal``; all-NaN when the workbook has no such column."""
    column = _signal_column(layout, car, signal)
    if column is None or column not in frame.columns:
        return pd.Series(np.nan, index=frame.index, dtype="float64")
    return frame[column]


def _cooling_mask(
    frame: pd.DataFrame, layout: CarLayout, car: str, indoor: pd.Series, setpoint: pd.Series, has_valid_flag: bool
) -> pd.Series:
    """Rows where the car reports valid telemetry, is actively cooling and has plausible temperatures."""
    running_mode = car_series(frame, layout, car, "running_mode").astype("string")
    mask = (
        running_mode.isin(COOLING_MODES).fillna(False).astype(bool)
        & indoor.between(*INDOOR_RANGE_C)
        & setpoint.between(*SETPOINT_RANGE_C)
    )
    if has_valid_flag:
        info_valid = car_series(frame, layout, car, "info_valid").astype("string")
        mask &= info_valid.eq("Valid").fillna(False).astype(bool)
    return mask


def cooling_panels(frame: pd.DataFrame, layout: CarLayout) -> CoolingPanels:
    """Indoor temperature, setpoint and cooling error per car on valid active-cooling rows."""
    # A schema without any 'ACV Information Valid' column (Case 04 style) cannot be filtered on it.
    has_valid_flag = any(_signal_column(layout, car, "info_valid") is not None for car in layout)
    indoor_by_car, setpoint_by_car, error_by_car, outdoor_by_car = {}, {}, {}, {}
    for car in layout:
        indoor = pd.to_numeric(car_series(frame, layout, car, "indoor"), errors="coerce")
        setpoint = pd.to_numeric(car_series(frame, layout, car, "setpoint"), errors="coerce")
        mask = _cooling_mask(frame, layout, car, indoor, setpoint, has_valid_flag)
        indoor_by_car[car] = indoor.where(mask)
        setpoint_by_car[car] = setpoint.where(mask)
        error_by_car[car] = (indoor - setpoint).where(mask)
        outdoor_by_car[car] = pd.to_numeric(car_series(frame, layout, car, "outdoor"), errors="coerce")
    return CoolingPanels(
        indoor=pd.DataFrame(indoor_by_car),
        setpoint=pd.DataFrame(setpoint_by_car),
        cooling_error=pd.DataFrame(error_by_car),
        outdoor=pd.DataFrame(outdoor_by_car).median(axis=1),
    )


# --------------------------------------------------------------------------------------
# Per-car features
# --------------------------------------------------------------------------------------


def _minus_train_median(panel: pd.DataFrame) -> pd.DataFrame:
    return panel.sub(panel.median(axis=1), axis=0)


def peer_relative_features(panels: CoolingPanels) -> pd.DataFrame:
    """Mean, positive area and >1 K share of each car's deviation from the train median."""
    error = panels.cooling_error
    cars_cooling = error.notna().sum(axis=1)
    live_cars = int((error.notna().sum() > 0).sum())
    comparable = cars_cooling >= max(MIN_COOLING_CARS, int(np.ceil(MIN_COOLING_SHARE * live_cars)))
    d_indoor = _minus_train_median(panels.indoor)[comparable]
    d_error = _minus_train_median(error)[comparable]
    rows_per_car = d_error.notna().sum()
    return pd.DataFrame(
        {
            "dE_mean": d_error.mean(),
            "dT_mean": d_indoor.mean(),
            "dE_pos_area": d_error.clip(lower=0).mean(),
            # NaN (not 0) for a car without comparable rows, so that it stays unscored.
            "dE_frac_gt1": (d_error > WARM_EXCESS_K).sum() / rows_per_car.where(rows_per_car > 0),
        }
    )


def same_setpoint_features(panels: CoolingPanels) -> pd.DataFrame:
    """Cabin excess over the train median on rows where the car has the train-median setpoint."""
    comparable = panels.cooling_error.notna().sum(axis=1) >= SAME_SETPOINT_MIN_CARS
    d_indoor = _minus_train_median(panels.indoor)[comparable]
    same_setpoint = (_minus_train_median(panels.setpoint).abs() < SAME_SETPOINT_TOLERANCE_K)[comparable]
    outdoor = panels.outdoor.reindex(d_indoor.index)
    hot = outdoor >= outdoor.quantile(HOT_QUANTILE)
    excess = d_indoor.where(same_setpoint)
    return pd.DataFrame(
        {
            "excess_same_setpoint_K": excess.mean(),
            "excess_same_setpoint_hot_K": excess[hot].mean(),
        }
    )


def extract_features(frame: pd.DataFrame, layout: CarLayout) -> pd.DataFrame:
    """One row per car (ascending car order), columns :data:`FEATURE_COLUMNS`."""
    panels = cooling_panels(frame, layout)
    features = peer_relative_features(panels).join(same_setpoint_features(panels))
    features = features.reindex(index=list(layout), columns=FEATURE_COLUMNS)
    if int(features["dE_mean"].notna().sum()) < MIN_COOLING_CARS:
        raise InvalidInputError(
            "Invalid ACV workbook: too few valid active-cooling rows to compare the cars "
            f"(at least {MIN_COOLING_CARS} cars must be cooling at the same time)."
        )
    return features

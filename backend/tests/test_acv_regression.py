"""ACV regression tests: the backend must reproduce the notebook's final consensus ranking.

Reference: ``ACV_Fault_Localisation_Final_End_to_End.ipynb`` cell 103 (``consensus_v2``), which
wrote ``acv_predictions.csv`` and reported the rank of the true faulty car per training case.
"""

from __future__ import annotations

import csv
import functools
import json
from pathlib import Path

import pytest

from core.errors import InvalidInputError
from models.acv.inference import predict_case

# Rank of the disclosed faulty car under the final scorer, as reported by the notebook:
# cell 103 lists rank 1 for the five test-compatible cases; Section 25.1 reports Case 04
# (rich schema, only cars 01-04 carry data) as "2nd of 4".
NOTEBOOK_TRUE_CAR_RANK = {
    "acv_case_01.xlsx": 1,
    "acv_case_02.xlsx": 1,
    "acv_case_03.xlsx": 1,
    "acv_case_04.xlsx": 2,
    "acv_case_05.xlsx": 1,
    "acv_case_06.xlsx": 1,
}
# Final suspicion scores printed by cell 103 for the test file (rounded to 2 decimals there).
NOTEBOOK_TEST_SCORES = {
    "01": 6.55, "04": 0.73, "03": 0.55, "07": 0.25, "08": 0.12, "06": -0.54, "02": -1.14, "05": -1.49,
}


@functools.lru_cache(maxsize=None)
def _predict(path: Path) -> dict:
    return predict_case(path)


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def _assert_well_formed(result: dict) -> None:
    cars = result["ranked_cars"]
    assert len(cars) == len(set(cars)) > 0
    assert [item["car"] for item in result["ranking_details"]] == cars
    assert all(type(car) is str for car in cars)
    assert all(item["score"] is None or type(item["score"]) is float for item in result["ranking_details"])
    scores = [item["score"] for item in result["ranking_details"] if item["score"] is not None]
    assert scores == sorted(scores, reverse=True)
    json.dumps(result, allow_nan=False)


@pytest.mark.regression
def test_test_case_matches_notebook_predictions(data_dir: Path, reference_dir: Path) -> None:
    reference = _read_csv(reference_dir / "acv_predictions.csv")
    assert reference, "acv_predictions.csv is empty"
    for row in reference:
        case_path = data_dir / "ACV" / "Test" / row["file_id"]
        if not case_path.is_file():
            pytest.skip(f"test case not found: {case_path}")
        result = _predict(case_path)
        _assert_well_formed(result)
        assert result["file_id"] == row["file_id"]
        assert "|".join(result["ranked_cars"]) == row["ranked_cars"]


@pytest.mark.regression
def test_test_case_scores_match_notebook_output(data_dir: Path) -> None:
    case_path = data_dir / "ACV" / "Test" / "acv_test_case.xlsx"
    if not case_path.is_file():
        pytest.skip(f"test case not found: {case_path}")
    scores = {item["car"]: item["score"] for item in _predict(case_path)["ranking_details"]}
    assert {car: round(score, 2) for car, score in scores.items()} == NOTEBOOK_TEST_SCORES


@pytest.mark.regression
@pytest.mark.parametrize("filename", sorted(NOTEBOOK_TRUE_CAR_RANK))
def test_training_case_true_car_rank_matches_notebook(data_dir: Path, filename: str) -> None:
    labels = {row["filename"]: row["faulty_car"].strip() for row in _read_csv(data_dir / "ACV" / "Train_Labels.csv")}
    case_path = data_dir / "ACV" / "Train" / filename
    if filename not in labels or not case_path.is_file():
        pytest.skip(f"training case or label not found: {filename}")
    result = _predict(case_path)
    _assert_well_formed(result)
    assert result["ranked_cars"].index(labels[filename]) + 1 == NOTEBOOK_TRUE_CAR_RANK[filename]


@pytest.mark.regression
def test_cars_without_data_are_ranked_last(data_dir: Path) -> None:
    """Case 04 has headers for 8 cars but telemetry for 01-04 only: all 8 are returned, the empty ones last."""
    case_path = data_dir / "ACV" / "Train" / "acv_case_04.xlsx"
    if not case_path.is_file():
        pytest.skip(f"training case not found: {case_path}")
    result = _predict(case_path)
    assert sorted(result["ranked_cars"]) == [f"{i:02d}" for i in range(1, 9)]
    assert sorted(result["ranked_cars"][:4]) == ["01", "02", "03", "04"]
    assert result["ranked_cars"][4:] == ["05", "06", "07", "08"]
    assert [item["score"] for item in result["ranking_details"][4:]] == [None] * 4


def test_corrupt_workbook_is_rejected(tmp_path: Path) -> None:
    bad = tmp_path / "not_a_workbook.xlsx"
    bad.write_bytes(b"this is not an xlsx file")
    with pytest.raises(InvalidInputError, match="could not be read"):
        predict_case(bad)


def test_workbook_without_car_columns_is_rejected(tmp_path: Path) -> None:
    openpyxl = pytest.importorskip("openpyxl")
    workbook = openpyxl.Workbook()
    workbook.active.append(["Car model", "Train number", "Time"])
    workbook.active.append(["A", 1, "2024-01-01 00:00:00"])
    path = tmp_path / "no_cars.xlsx"
    workbook.save(path)
    with pytest.raises(InvalidInputError, match="no per-car columns"):
        predict_case(path)


def test_cars_are_discovered_from_headers(tmp_path: Path) -> None:
    """Car ids come from the file's own headers (any count, any labels) and the warm car ranks first."""
    openpyxl = pytest.importorskip("openpyxl")
    cars = ["11", "12", "13", "14"]
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    header, row_cool, row_warm = ["Time"], ["t"], ["t"]
    for car in reversed(cars):  # header order is deliberately not sorted
        header += [f"Car {car} - {p}" for p in ("Indoor Average Temperature", "ACV Control Temperature (Cooling)", "ACV Running Mode", "ACV Information Valid")]
        indoor = {"11": 24.0, "12": 24.2, "13": 27.5, "14": 23.9}[car]
        row_cool += [indoor, 24, "Automatic Cooling", "Valid"]
        row_warm += [indoor + 0.5, 24, "Full Cooling", "Valid"]
    sheet.append(header)
    for index in range(40):
        sheet.append(row_cool if index % 2 else row_warm)
    path = tmp_path / "four_cars.xlsx"
    workbook.save(path)
    result = predict_case(path, file_id="upload.xlsx")
    _assert_well_formed(result)
    assert result["file_id"] == "upload.xlsx"
    assert sorted(result["ranked_cars"]) == cars
    assert result["ranked_cars"][0] == "13"

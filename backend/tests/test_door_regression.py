"""Door regression tests: the backend port must reproduce the notebook's outputs."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pytest

from core.errors import InvalidInputError
from models.door.features import read_stream, segment_metadata, segment_stream
from models.door.inference import load_model, predict_stream

CONFIDENCE_TOLERANCE = 1e-3
LABELS = {"Normal", "Abnormal resistance"}


def _read_text_csv(path: Path) -> pd.DataFrame:
    """Read a CSV with every cell kept as text so timestamps compare verbatim."""
    return pd.read_csv(path, dtype=str)


@pytest.fixture(scope="module")
def test_predictions(data_dir: Path) -> list[dict]:
    return predict_stream(data_dir / "Door" / "Test.csv")


@pytest.mark.regression
def test_test_csv_matches_notebook_predictions(test_predictions: list[dict], reference_dir: Path) -> None:
    reference = _read_text_csv(reference_dir / "door_predictions.csv")
    got = pd.DataFrame(test_predictions)

    assert list(got.columns) == ["start_time", "end_time", "prediction", "confidence"]
    assert len(got) == len(reference) == 38
    assert got["start_time"].tolist() == reference["start_time"].tolist()
    assert got["end_time"].tolist() == reference["end_time"].tolist()
    assert got["prediction"].tolist() == reference["prediction"].tolist()
    assert got["prediction"].value_counts().to_dict() == {"Normal": 30, "Abnormal resistance": 8}

    difference = (got["confidence"] - reference["confidence"].astype(float)).abs()
    assert difference.max() <= CONFIDENCE_TOLERANCE, f"max confidence difference {difference.max()}"


@pytest.mark.regression
def test_predictions_are_plain_json_types(test_predictions: list[dict]) -> None:
    for row in test_predictions:
        assert type(row["start_time"]) is str and type(row["end_time"]) is str
        assert type(row["prediction"]) is str and row["prediction"] in LABELS
        assert type(row["confidence"]) is float and 0.5 <= row["confidence"] <= 1.0
    json.dumps(test_predictions)


@pytest.mark.regression
def test_train_segmentation_matches_answer_file(data_dir: Path) -> None:
    answers = _read_text_csv(data_dir / "Door" / "Train_Segments_Answer.csv")
    metadata = segment_metadata(segment_stream(read_stream(data_dir / "Door" / "Train.csv")))

    assert len(metadata) == len(answers) == 110
    assert metadata["start_time"].tolist() == answers["start_time"].tolist()
    assert metadata["end_time"].tolist() == answers["end_time"].tolist()
    assert metadata["n_rows"].tolist() == answers["n_rows"].astype(int).tolist()
    assert metadata["operation"].tolist() == answers["operation"].tolist()


@pytest.mark.regression
def test_train_labels_are_recovered_end_to_end(data_dir: Path) -> None:
    """Sanity check on the fitted data: every labelled training cycle gets its own label."""
    answers = _read_text_csv(data_dir / "Door" / "Train_Segments_Answer.csv")
    predictions = predict_stream(data_dir / "Door" / "Train.csv")
    assert [row["prediction"] for row in predictions] == answers["status"].tolist()


def test_model_is_loaded_once() -> None:
    assert load_model() is load_model()


# --------------------------------------------------------------------------- #
# Input validation
# --------------------------------------------------------------------------- #

HEADER = (
    "Datetime,Motor current(mA),Motor Voltage(10mV),Motor electrodynamic force,"
    "Close command,Open command,Door is opening,Door is closing,Door leaf position"
)


def _write(tmp_path: Path, text: str) -> Path:
    path = tmp_path / "upload.csv"
    path.write_text(text, encoding="utf-8")
    return path


def test_empty_file_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(InvalidInputError, match="empty"):
        predict_stream(_write(tmp_path, ""))


def test_header_only_file_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(InvalidInputError, match="no data rows"):
        predict_stream(_write(tmp_path, HEADER + "\n"))


def test_missing_columns_are_named(tmp_path: Path) -> None:
    with pytest.raises(InvalidInputError) as excinfo:
        predict_stream(_write(tmp_path, "Datetime,Motor current(mA)\n2023-7-5-0-0-0-0,121\n"))
    assert "Door leaf position" in excinfo.value.message
    assert "Open command" in excinfo.value.message


def test_unparseable_timestamp_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(InvalidInputError, match="could not be parsed"):
        predict_stream(_write(tmp_path, HEADER + "\n2023-07-05 00:00:00,121,400,64,1,0,0,1,700\n"))


def test_impossible_date_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(InvalidInputError, match="impossible"):
        predict_stream(_write(tmp_path, HEADER + "\n2023-13-5-0-0-0-0,121,400,64,1,0,0,1,700\n"))


def test_non_numeric_sensor_value_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(InvalidInputError, match="Motor current"):
        predict_stream(_write(tmp_path, HEADER + "\n2023-7-5-0-0-0-0,abc,400,64,1,0,0,1,700\n"))


def test_binary_garbage_is_rejected(tmp_path: Path) -> None:
    path = tmp_path / "upload.csv"
    path.write_bytes(bytes(range(256)) * 64)
    with pytest.raises(InvalidInputError):
        predict_stream(path)


def test_very_short_segments_do_not_crash(tmp_path: Path) -> None:
    """A stray isolated row forms its own segment; the notebook's features would IndexError."""
    rows = ["2023-7-5-0-0-0-0,121,400,64,1,0,0,1,700"]
    rows += [f"2023-7-5-0-0-5-{20 * i},150,600,112,1,0,0,1,{700 - 10 * i}" for i in range(6)]
    result = predict_stream(_write(tmp_path, HEADER + "\n" + "\n".join(rows) + "\n"))
    assert [(r["start_time"], r["end_time"]) for r in result] == [
        ("2023-7-5-0-0-0-0", "2023-7-5-0-0-0-0"),
        ("2023-7-5-0-0-5-0", "2023-7-5-0-0-5-100"),
    ]
    assert all(r["prediction"] in LABELS for r in result)

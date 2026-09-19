"""SHM: the backend must reproduce the notebook's published ``shm_predictions.csv``."""

from __future__ import annotations

import math
from pathlib import Path

import pandas as pd
import pytest

import config
from core.errors import InvalidInputError
from models.shm import features, inference

REFERENCE_FILE = "shm_predictions.csv"
RELATIVE_TOLERANCE = 1e-12  # achieved: 2.4e-15 (last-bit noise from the notebook's CSV proxy cache)


@pytest.fixture(scope="module")
def artifact() -> dict:
    if not config.SHM_MODEL_PATH.is_file():
        pytest.skip(
            f"SHM model artifact missing at {config.SHM_MODEL_PATH}. "
            "Run: python scripts/export_shm_model.py"
        )
    return inference.load_model()


@pytest.fixture(scope="module")
def reference(reference_dir: Path) -> pd.Series:
    path = reference_dir / REFERENCE_FILE
    if not path.is_file():
        pytest.skip(f"notebook predictions not found at {path}")
    frame = pd.read_csv(path, float_precision="round_trip")
    return frame.set_index("file_id")["prediction"]


@pytest.fixture(scope="module")
def predictions(artifact: dict, data_dir: Path, reference: pd.Series) -> list[dict]:
    test_dir = data_dir / "SHM" / "Test"
    missing = [name for name in reference.index if not (test_dir / name).is_file()]
    if missing:
        pytest.skip(f"SHM test files not found in {test_dir}: {missing}")
    return inference.predict_files([(name, test_dir / name) for name in reference.index])


@pytest.mark.regression
def test_reproduces_notebook_predictions(predictions: list[dict], reference: pd.Series) -> None:
    assert [item["file_id"] for item in predictions] == list(reference.index)
    assert len(predictions) == 16
    for item in predictions:
        expected = reference[item["file_id"]]
        assert item["prediction"] == pytest.approx(expected, rel=RELATIVE_TOLERANCE, abs=0), item["file_id"]


@pytest.mark.regression
def test_predictions_are_plain_positive_floats(predictions: list[dict]) -> None:
    for item in predictions:
        assert set(item) == {"file_id", "prediction"}
        assert type(item["prediction"]) is float
        assert math.isfinite(item["prediction"]) and item["prediction"] > 0


@pytest.mark.regression
def test_any_number_of_files_in_input_order(artifact: dict, data_dir: Path, reference: pd.Series) -> None:
    test_dir = data_dir / "SHM" / "Test"
    names = [reference.index[5], reference.index[0]]
    results = inference.predict_files([(f"upload-{name}", test_dir / name) for name in names])
    assert [item["file_id"] for item in results] == [f"upload-{name}" for name in names]
    for name, item in zip(names, results):
        assert item["prediction"] == pytest.approx(reference[name], rel=RELATIVE_TOLERANCE, abs=0)
    assert inference.predict_files([]) == []


@pytest.mark.regression
def test_artifact_describes_the_final_model(artifact: dict) -> None:
    assert artifact["proxy_columns"] == list(features.PROXY_COLUMNS)
    assert artifact["linear_columns"] == ["logS3_rep", "logS5_c65"]
    assert artifact["n_classes"] == 65
    assert type(artifact["model"]).__module__ == "models.shm.model"


@pytest.mark.parametrize(
    ("content", "fragment"),
    [
        ("", "empty"),
        ("1.0,2.0\n3.0,4.0\n" * 600, "expected 1 stress column"),
        ("abc\n" * 1200, "non-numeric"),
        ("1.5\n2.5\n3.5\n", "valid samples"),
        ("2.0\n" * 1200, "constant"),
    ],
)
def test_unusable_csv_is_rejected_with_the_file_name(tmp_path: Path, content: str, fragment: str) -> None:
    path = tmp_path / "upload.csv"
    path.write_text(content, encoding="utf-8")
    with pytest.raises(InvalidInputError) as excinfo:
        features.load_signal(path)
    assert "upload.csv" in excinfo.value.message
    assert fragment in excinfo.value.message


def test_single_header_row_is_tolerated(tmp_path: Path) -> None:
    values = [str(0.5 * (i % 7) - 0.1 * (i % 3)) for i in range(1500)]
    plain, headed = tmp_path / "plain.csv", tmp_path / "headed.csv"
    plain.write_text("\n".join(values) + "\n", encoding="utf-8")
    headed.write_text("stress\n" + "\n".join(values) + "\n", encoding="utf-8")
    assert features.load_signal(headed).tolist() == features.load_signal(plain).tolist()

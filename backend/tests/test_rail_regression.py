"""Rail corrugation: the backend must reproduce ``Rail_Training_v2_Model_Zoo.ipynb``.

Reference material (all written by the notebook run ``v2_20260918_233818``):

* ``rail_predictions.csv`` - submitted labels of the held-out Test recordings;
* ``rail_prediction_probabilities.csv`` - the same run's probabilities, stored with 4 decimals,
  so the comparison tolerance is half a unit of the 4th decimal (5e-5). The backend's
  unrounded probabilities were verified to be bit-identical to the notebook code;
* ``features_v2.npz`` - the notebook's full-precision float32 Train features, reproduced exactly.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from core.errors import InvalidInputError, ModelArtifactMissingError
from models.rail import inference
from models.rail.features import expected_columns, extract_features

RUN_DIR = Path("rail_runs") / "v2_20260918_233818"  # inside <data_dir>/Rail_Corrugation
ROUNDING_TOLERANCE = 5e-5 + 1e-9  # the reference CSV keeps 4 decimals
FEATURE_TOLERANCE = 0.0  # features_v2.npz is full precision: exact match required


# --------------------------------------------------------------------------- fixtures


@pytest.fixture(scope="module")
def rail_dir(data_dir: Path) -> Path:
    path = data_dir / "Rail_Corrugation"
    if not (path / "Test").is_dir():
        pytest.skip(f"Rail test recordings not found at {path / 'Test'}")
    return path


@pytest.fixture(scope="module")
def reference(rail_dir: Path, reference_dir: Path) -> pd.DataFrame:
    """One row per Test file: notebook label plus notebook probabilities (metadata class order)."""
    labels_file = reference_dir / "rail_predictions.csv"
    probabilities_file = rail_dir / RUN_DIR / "rail_prediction_probabilities.csv"
    for path in (labels_file, probabilities_file):
        if not path.is_file():
            pytest.skip(f"notebook reference not found: {path}")
    labels = pd.read_csv(labels_file)
    probabilities = pd.read_csv(probabilities_file).drop(columns=["prediction"])
    table = labels.merge(probabilities, on="file_id", how="left", validate="one_to_one")
    assert not table.isna().any().any(), "label and probability references list different files"
    return table


def _probability_columns() -> list[str]:
    return ["p_" + name.lower().replace(" ", "_") for name in inference.load_models().class_names]


def _assert_matches_notebook(results: list[dict], expected: pd.DataFrame) -> float:
    """Compare backend results with reference rows (same order); returns the max probability gap."""
    class_names = list(inference.load_models().class_names)
    assert [r["file_id"] for r in results] == list(expected["file_id"])
    wrong = [
        (r["file_id"], r["prediction"], label)
        for r, label in zip(results, expected["prediction"])
        if r["prediction"] != label
    ]
    assert not wrong, f"{len(wrong)} of {len(results)} labels differ from the notebook: {wrong[:5]}"

    got = np.array([[r["probabilities"][name] for name in class_names] for r in results])
    want = expected[_probability_columns()].to_numpy()
    gap = float(np.abs(got - want).max())
    assert gap <= ROUNDING_TOLERANCE, f"max |p - notebook| = {gap:.3g}"
    assert np.abs(np.round(got, 4) - want).max() < 1e-9  # identical at the stored precision
    assert np.allclose(got.sum(1), 1.0, atol=1e-9)
    return gap


def _predict(rail_dir: Path, file_ids: list[str]) -> list[dict]:
    return inference.predict_recordings([(name, rail_dir / "Test" / name) for name in file_ids])


# --------------------------------------------------------------------------- regression tests


@pytest.mark.regression
def test_rail_fast_subset_matches_notebook(rail_dir: Path, reference: pd.DataFrame) -> None:
    """One reference file per predicted class: labels, probabilities, plain JSON types."""
    subset = reference.groupby("prediction", sort=False).head(1)
    assert set(subset["prediction"]) == set(inference.load_models().class_names)
    results = _predict(rail_dir, list(subset["file_id"]))
    _assert_matches_notebook(results, subset)

    json.dumps(results)  # raises on NumPy scalars
    for result in results:
        assert type(result["file_id"]) is str and type(result["prediction"]) is str
        assert all(type(k) is str and type(v) is float for k, v in result["probabilities"].items())

    # A file scores the same alone as inside a batch (per-file features, row-wise models).
    assert _predict(rail_dir, [results[-1]["file_id"]]) == results[-1:]


@pytest.mark.regression
def test_rail_features_match_notebook_exactly(rail_dir: Path) -> None:
    """Features from raw Train CSVs equal the notebook's cached full-precision features."""
    features_file = rail_dir / RUN_DIR / "features_v2.npz"
    if not features_file.is_file():
        pytest.skip(f"notebook features not found: {features_file}")
    stored = np.load(features_file)
    models = inference.load_models()
    assert tuple(stored["names"]) == models.feature_names
    first_of_each_class = [int(np.flatnonzero(stored["y"] == k)[0]) for k in np.unique(stored["y"])]
    for i in first_of_each_class:
        name = str(stored["filenames"][i])
        natural, swapped = extract_features(rail_dir / "Train" / name, name, models.feature_names, models.settings)
        assert natural.dtype == np.float32 and natural.shape == (len(models.feature_names),)
        assert np.abs(natural - stored["X"][i]).max() <= FEATURE_TOLERANCE, name
        assert np.abs(swapped - stored["X_swap"][i]).max() <= FEATURE_TOLERANCE, name


@pytest.mark.regression
@pytest.mark.slow
def test_rail_all_test_files_match_notebook(rail_dir: Path, reference: pd.DataFrame) -> None:
    """Every recording in Test/ reproduces the notebook's label and probabilities."""
    on_disk = {path.name for path in (rail_dir / "Test").glob("*.csv")}
    assert on_disk == set(reference["file_id"]), "Test folder and notebook reference list different files"
    results = _predict(rail_dir, list(reference["file_id"]))
    assert len(results) == len(on_disk)
    _assert_matches_notebook(results, reference)


# --------------------------------------------------------------------------- input validation


def _write_csv(path: Path, columns: list[str], rows: int, fill: object = 0.5) -> Path:
    pd.DataFrame({column: [fill] * rows for column in columns}).to_csv(path, index=False)
    return path


@pytest.mark.parametrize(
    ("columns", "rows", "fill", "fragment"),
    [
        (expected_columns()[:12], 50, 0.5, "expected 129 columns but received 12"),
        ([f"c{i}" for i in range(129)], 50, 0.5, "unexpected column headers"),
        (expected_columns(), 0, 0.5, "no samples"),
        (expected_columns(), 50, 0.5, "too short"),
        (expected_columns(), 50, "abc", "numeric"),
        (expected_columns(), 50, float("nan"), "non-finite"),
    ],
)
def test_rail_rejects_unusable_csv(tmp_path: Path, columns: list[str], rows: int, fill: object, fragment: str) -> None:
    path = _write_csv(tmp_path / "upload.tmp", columns, rows, fill)
    with pytest.raises(InvalidInputError) as error:
        inference.predict_recordings([("x.csv", path)])
    assert error.value.message.startswith("Invalid Rail CSV 'x.csv': ")
    assert fragment in error.value.message


def test_rail_rejects_empty_file(tmp_path: Path) -> None:
    path = tmp_path / "empty.csv"
    path.write_bytes(b"")
    with pytest.raises(InvalidInputError, match="Invalid Rail CSV 'empty.csv': the file is empty"):
        inference.predict_recordings([("empty.csv", path)])


def test_rail_no_files_returns_empty_list() -> None:
    assert inference.predict_recordings([]) == []


def test_rail_missing_artifact_is_named(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    import config

    monkeypatch.setattr(config, "RAIL_MODEL_DIR", tmp_path)
    inference.load_models.cache_clear()
    try:
        with pytest.raises(ModelArtifactMissingError, match="metadata.json"):
            inference.load_models()
    finally:
        inference.load_models.cache_clear()

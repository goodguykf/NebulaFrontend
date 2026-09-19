"""SHM inference: stress CSV files -> predicted cumulative fatigue damage.

Only loads the exported artifact and predicts; training lives in
``scripts/export_shm_model.py``.
"""

from __future__ import annotations

import logging
import math
from collections.abc import Sequence
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn

import config
from core.errors import BackendError, InferenceError, ModelArtifactMissingError
from models.shm import features

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def load_model() -> dict:
    """The exported artifact dict (estimator + feature settings), loaded once per process."""
    path = config.SHM_MODEL_PATH
    if not path.is_file():
        raise ModelArtifactMissingError(
            "SHM model artifact not found. Run: python scripts/export_shm_model.py"
        )
    try:
        artifact = joblib.load(path)
    except Exception as exc:
        logger.exception("could not load %s", path)
        raise InferenceError(
            "SHM model artifact could not be loaded. Re-run: python scripts/export_shm_model.py"
        ) from exc
    unknown = set(artifact["proxy_columns"]) - set(features.PROXY_COLUMNS)
    if unknown:
        raise InferenceError(
            "SHM model artifact does not match the feature code. Re-run: python scripts/export_shm_model.py"
        )
    if artifact.get("sklearn_version") != sklearn.__version__:
        logger.warning(
            "SHM model was exported with scikit-learn %s, running %s",
            artifact.get("sklearn_version"),
            sklearn.__version__,
        )
    return artifact


def _proxies(file_id: str, path: Path) -> dict[str, float]:
    try:
        return features.proxies_for_file(path)
    except BackendError:
        raise
    except Exception as exc:
        logger.exception("SHM feature extraction failed for %s", file_id)
        raise InferenceError(f"{file_id}: fatigue features could not be computed.") from exc


def _warn_outside_training_range(artifact: dict, file_id: str, row: dict[str, float]) -> None:
    low, high = artifact.get("proxy_train_min", {}), artifact.get("proxy_train_max", {})
    outside = [c for c in low if not low[c] <= row[c] <= high[c]]
    if outside:
        logger.warning("%s: %d damage proxies lie outside the training range", file_id, len(outside))


def predict_files(files: Sequence[tuple[str, Path]]) -> list[dict]:
    """files = [(file_id, path_on_disk), ...]; any number of files.

    Returns, in input order: {"file_id": str, "prediction": float}
    """
    artifact = load_model()
    if not files:
        return []
    rows = []
    for file_id, path in files:
        row = _proxies(file_id, Path(path))
        _warn_outside_training_range(artifact, file_id, row)
        rows.append(row)
    table = pd.DataFrame(rows)[artifact["proxy_columns"]]
    try:
        damage = np.exp(artifact["model"].predict(table))  # the model predicts log-damage
    except Exception as exc:
        logger.exception("SHM model prediction failed")
        raise InferenceError("The SHM model failed to produce predictions.") from exc

    results = []
    for (file_id, _), value in zip(files, damage):
        prediction = float(value)
        if not (math.isfinite(prediction) and prediction > 0):
            raise InferenceError(f"{file_id}: the SHM model produced an invalid damage value.")
        results.append({"file_id": file_id, "prediction": prediction})
    return results

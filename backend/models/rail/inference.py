"""Rail corrugation inference: uploaded CSV recordings -> Normal / Side I / Side II.

Port of ``predict_recordings`` (cell 28 of ``Rail_Training_v2_Model_Zoo.ipynb``). Decision rule:

1. every selected model scores the natural (A = Side I, B = Side II) and the side-swapped
   feature rows; ``p_model = 0.5 * (p(natural) + p(swapped)[:, SWAP])`` (test-time side swap);
2. ``p = mean over models`` (equal weights);
3. ``prediction = argmax(log(p + 1e-9) + class_bias)``.
"""

from __future__ import annotations

import json
import logging
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from functools import lru_cache, partial
from pathlib import Path
from typing import Any, Sequence

import joblib
import numpy as np

import config
from core.errors import BackendError, InferenceError, ModelArtifactMissingError
from models.rail.features import FeatureSettings, extract_features

logger = logging.getLogger(__name__)

METADATA_FILE = "metadata.json"
# Class-index permutation when Side I and Side II are exchanged (notebook ``SWAP``).
SIDE_SWAP: tuple[int, ...] = (0, 2, 1)
MAX_EXTRACT_WORKERS = 4  # each worker holds one ~17 MB recording plus its spectra (~100 MB)


@dataclass(frozen=True)
class RailModels:
    """Everything loaded once per process: fitted estimators plus the notebook's metadata."""

    estimators: tuple[tuple[str, Any, Any], ...]  # (name, classifier, optional scaler)
    class_names: tuple[str, ...]
    class_bias: tuple[float, ...]
    feature_names: tuple[str, ...]
    settings: FeatureSettings


def _require(path: Path) -> Path:
    if not path.is_file():
        raise ModelArtifactMissingError(f"Rail model artifact '{path.name}' is missing from {path.parent}.")
    return path


@lru_cache(maxsize=1)
def load_models() -> RailModels:
    """Load metadata.json and the selected ``<name>.joblib`` models (cached for the process)."""
    model_dir = Path(config.RAIL_MODEL_DIR)
    metadata = json.loads(_require(model_dir / METADATA_FILE).read_text(encoding="utf-8"))
    class_names = tuple(metadata["class_names"])
    if len(class_names) != len(SIDE_SWAP):
        raise InferenceError(f"Rail metadata lists {len(class_names)} classes; expected {len(SIDE_SWAP)}.")
    estimators = []
    for name in metadata["selected_models"]:
        classifier, scaler = joblib.load(_require(model_dir / f"{name}.joblib"))
        estimators.append((name, classifier, scaler))
    logger.info("Rail models loaded: %s", ", ".join(metadata["selected_models"]))
    return RailModels(
        estimators=tuple(estimators),
        class_names=class_names,
        class_bias=tuple(float(b) for b in metadata["class_bias"]),
        feature_names=tuple(metadata["feature_names"]),
        settings=FeatureSettings.from_metadata(metadata),
    )


def _extract_one(item: tuple[str, Path], models: RailModels) -> tuple[np.ndarray, np.ndarray]:
    """Natural and side-swapped feature rows of one file; failures are reported by file id."""
    file_id, path = item
    try:
        return extract_features(Path(path), str(file_id), models.feature_names, models.settings)
    except BackendError:
        raise
    except Exception as exc:  # unexpected numerical failure on a file that passed validation
        logger.exception("Rail feature extraction failed for %s", file_id)
        raise InferenceError(f"Rail feature extraction failed for '{file_id}'.") from exc


def _feature_matrices(files: Sequence[tuple[str, Path]], models: RailModels) -> tuple[np.ndarray, np.ndarray]:
    """Natural and side-swapped feature matrices, rows in input order.

    CSV parsing and the FFTs release the GIL, so a few threads cut the wall time about 3x;
    each file is still processed independently, so the values do not depend on the pool.
    """
    workers = min(MAX_EXTRACT_WORKERS, len(files))
    if workers <= 1:
        rows = [_extract_one(item, models) for item in files]
    else:
        pool = ThreadPoolExecutor(max_workers=workers, thread_name_prefix="rail-features")
        try:
            rows = list(pool.map(partial(_extract_one, models=models), files))
        finally:
            pool.shutdown(wait=False, cancel_futures=True)  # stop early if one file is invalid
    return np.stack([natural for natural, _ in rows]), np.stack([swapped for _, swapped in rows])


def _class_probabilities(classifier: Any, scaler: Any, X: np.ndarray, n_classes: int) -> np.ndarray:
    """``predict_proba`` scattered into the full class order (a model may have seen fewer classes)."""
    p = np.zeros((len(X), n_classes))
    p[:, classifier.classes_.astype(int)] = classifier.predict_proba(scaler.transform(X) if scaler else X)
    return p


def _ensemble_probabilities(models: RailModels, natural: np.ndarray, swapped: np.ndarray) -> np.ndarray:
    """Equal-weight mean of the models' side-swap-averaged probabilities, shape (n_files, n_classes)."""
    n = len(natural)
    both = np.vstack([natural, swapped])  # one predict_proba call per model
    swap = np.array(SIDE_SWAP)
    probs = []
    for _, classifier, scaler in models.estimators:
        p = _class_probabilities(classifier, scaler, both, len(models.class_names))
        probs.append(0.5 * (p[:n] + p[n:][:, swap]))
    return np.mean(probs, 0)


def predict_recordings(files: Sequence[tuple[str, Path]]) -> list[dict]:
    """files = [(file_id, path_on_disk), ...]; any number of files (1, 5, 20, 68, ...).

    Returns, in input order:
    {"file_id": str, "prediction": "Normal" | "Side I" | "Side II",
     "probabilities": {"Normal": float, "Side I": float, "Side II": float}}
    (class names and their order come from metadata.json).
    """
    files = list(files)
    if not files:
        return []
    models = load_models()
    natural, swapped = _feature_matrices(files, models)
    try:
        p = _ensemble_probabilities(models, natural, swapped)
    except Exception as exc:
        logger.exception("Rail ensemble prediction failed")
        raise InferenceError("Rail model prediction failed.") from exc
    predicted = (np.log(p + 1e-9) + np.array(models.class_bias)).argmax(1)
    return [
        {
            "file_id": str(file_id),
            "prediction": models.class_names[int(k)],
            "probabilities": {name: float(value) for name, value in zip(models.class_names, row)},
        }
        for (file_id, _), k, row in zip(files, predicted, p)
    ]

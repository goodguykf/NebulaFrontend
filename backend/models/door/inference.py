"""Door inference: segment an uploaded stream into cycles and classify each one.

Final logic of ``DOOR_Anomaly_Detection.ipynb`` (cell 7): the abnormal probability
is the average of two RandomForests (cycle statistics + door-position bands) and a
segment is ``Abnormal resistance`` when that average reaches the saved threshold.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

import config
from core.errors import InferenceError, InvalidInputError, ModelArtifactMissingError
from models.door.features import (
    position_features,
    read_stream,
    segment_metadata,
    segment_stream,
    statistical_features,
)

logger = logging.getLogger(__name__)

LABEL_NORMAL = "Normal"
LABEL_ABNORMAL = "Abnormal resistance"
CONFIDENCE_DECIMALS = 3
_ARTIFACT_KEYS = ("model", "feature_columns", "model_position", "position_columns", "threshold")


@lru_cache(maxsize=1)
def load_model() -> dict:
    """Load the trained door artifact once per process."""
    path = Path(config.DOOR_MODEL_PATH)
    if not path.is_file():
        raise ModelArtifactMissingError(f"Door model file not found: {path.name}.")
    try:
        artifact = joblib.load(path)
    except Exception as exc:  # unpickling can fail in many ways (version, truncation...)
        raise InferenceError("The door model file could not be loaded.") from exc
    missing = [key for key in _ARTIFACT_KEYS if not isinstance(artifact, dict) or key not in artifact]
    if missing:
        raise InferenceError("The door model file is incomplete (missing: " + ", ".join(missing) + ").")
    return artifact


def _align(frame: pd.DataFrame, columns: list[str], name: str) -> pd.DataFrame:
    """Order the columns as the forest was fitted and clean inf/NaN like the notebook."""
    missing = [column for column in columns if column not in frame.columns]
    if missing:
        raise InferenceError(
            f"Door {name} features lack {len(missing)} column(s) the model expects "
            f"(e.g. '{missing[0]}')."
        )
    return frame[list(columns)].replace([np.inf, -np.inf], np.nan).fillna(0)


def _abnormal_probability(artifact: dict, segments: list[pd.DataFrame]) -> np.ndarray:
    """Average abnormal probability of the two forests, all segments in one batch."""
    x_stat = _align(statistical_features(segments), artifact["feature_columns"], "statistical")
    x_pos = _align(position_features(segments), artifact["position_columns"], "position")
    try:
        p_stat = artifact["model"].predict_proba(x_stat)[:, 1]
        p_pos = artifact["model_position"].predict_proba(x_pos)[:, 1]
    except Exception as exc:
        raise InferenceError("The door model failed while scoring the uploaded stream.") from exc
    return (p_stat + p_pos) / 2


def predict_stream(path: Path) -> list[dict]:
    """One dict per detected segment, in time order:
    {"start_time": str, "end_time": str, "prediction": "Normal" | "Abnormal resistance", "confidence": float}

    ``confidence`` is the probability of the predicted class, rounded to 3 decimals:
    ``p`` when ``p >= threshold`` else ``1 - p`` (``p`` = averaged abnormal probability).
    """
    artifact = load_model()
    segments = segment_stream(read_stream(Path(path)))
    if not segments:
        raise InvalidInputError("No door cycles were found in the uploaded file.")

    threshold = float(artifact["threshold"])
    probability = _abnormal_probability(artifact, segments)
    abnormal = probability >= threshold
    confidence = np.where(abnormal, probability, 1 - probability).round(CONFIDENCE_DECIMALS)
    metadata = segment_metadata(segments)
    logger.info("Door stream: %d segment(s), %d flagged abnormal", len(segments), int(abnormal.sum()))

    return [
        {
            "start_time": str(start),
            "end_time": str(end),
            "prediction": LABEL_ABNORMAL if flagged else LABEL_NORMAL,
            "confidence": float(conf),
        }
        for start, end, flagged, conf in zip(
            metadata["start_time"], metadata["end_time"], abnormal.tolist(), confidence.tolist()
        )
    ]

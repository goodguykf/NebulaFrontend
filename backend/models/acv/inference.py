"""ACV refrigerant-leak localisation: consensus score and final car ranking.

Port of the notebook's final scorer (``ACV_Fault_Localisation_Final_End_to_End.ipynb``,
cell 95 ``robust_z`` and cell 103 ``consensus_v2``). The score is parameter-free: every
feature is turned into a robust z-score *within the uploaded case* (median / MAD across the
cars of that train) and the six z-scores are averaged. Nothing is fitted, so there is no
model artefact to load.
"""

from __future__ import annotations

import logging
import math
from pathlib import Path

import numpy as np
import pandas as pd

from core.errors import BackendError, InferenceError
from models.acv.features import FEATURE_COLUMNS, extract_features, load_case

logger = logging.getLogger(__name__)

MAD_TO_SIGMA = 1.4826
MIN_SCALE = 1e-9
Z_CLIP = 25.0


def robust_z(features: pd.DataFrame) -> pd.DataFrame:
    """Per-feature robust z-score across cars: (x - median) / (1.4826 * MAD), clipped to +/-25.

    Falls back to the standard deviation when the MAD is degenerate, and to 1 when both are.
    """
    median = features.median()
    mad = (features - median).abs().median() * MAD_TO_SIGMA
    scale = mad.where(mad > MIN_SCALE, features.std()).replace(0, np.nan).fillna(1.0)
    return ((features - median) / scale).clip(-Z_CLIP, Z_CLIP)


def consensus_scores(features: pd.DataFrame) -> pd.Series:
    """Mean robust z over the six consensus features; a feature that is NaN for a car is skipped."""
    return robust_z(features[FEATURE_COLUMNS]).mean(axis=1)


def rank_cars(scores: pd.Series) -> pd.Series:
    """Most suspicious first. Unscored cars (NaN) go last; ties keep ascending car order."""
    return scores.sort_values(ascending=False, kind="stable", na_position="last")


def _json_score(value: float) -> float | None:
    number = float(value)
    return number if math.isfinite(number) else None


def predict_case(path: Path, file_id: str | None = None) -> dict:
    """Rank the cars of one ACV case workbook from most to least likely to have the leak.

    Returns ``{"file_id": str, "ranked_cars": list[str], "ranking_details": [{"car": str,
    "score": float | None}, ...]}``. ``score`` is the consensus value (mean robust z, higher =
    more suspicious); it is ``None`` for a car that has headers but no usable cooling data,
    and such cars are always ranked last.
    """
    path = Path(path)
    try:
        frame, layout = load_case(path)
        ranked = rank_cars(consensus_scores(extract_features(frame, layout)))
    except BackendError:
        raise
    except Exception as exc:  # noqa: BLE001 - never leak a raw pandas/numpy error to the API
        logger.exception("ACV inference failed for %s", path.name)
        raise InferenceError("ACV inference failed while scoring the workbook.") from exc

    details = [{"car": str(car), "score": _json_score(score)} for car, score in ranked.items()]
    return {
        "file_id": file_id if file_id is not None else path.name,
        "ranked_cars": [item["car"] for item in details],
        "ranking_details": details,
    }

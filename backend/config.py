"""Backend settings. Every path is relative to this file; override via environment."""

from __future__ import annotations

import os
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent
MODELS_DIR = BACKEND_ROOT / "models"
STATIC_DIR = BACKEND_ROOT / "static"
# Optional: the exported Expo web build (npx expo export -p web). Served at "/" when present.
FRONTEND_DIST = Path(os.environ.get("FRONTEND_DIST", BACKEND_ROOT / "frontend_dist"))

DOOR_MODEL_PATH = MODELS_DIR / "door" / "door_resistance_model.joblib"
RAIL_MODEL_DIR = MODELS_DIR / "rail"
SHM_MODEL_PATH = MODELS_DIR / "shm" / "shm_final_model.joblib"

DEFAULT_CORS_ORIGINS = (
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8081",  # Expo web dev server
    "http://localhost:19006",
)


def cors_origins() -> list[str]:
    """Allowed frontend origins: comma-separated CORS_ORIGINS, else local dev servers."""
    raw = os.environ.get("CORS_ORIGINS", "")
    origins = [item.strip().rstrip("/") for item in raw.split(",") if item.strip()]
    return origins or list(DEFAULT_CORS_ORIGINS)


def cors_origin_regex() -> str | None:
    """Optional regex for preview deployments, e.g. https://.*\\.vercel\\.app"""
    return os.environ.get("CORS_ORIGIN_REGEX") or None


# Largest single upload accepted (a Rail recording is about 17 MB).
MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_MB", "200")) * 1024 * 1024

# Completed analyses kept in memory for the frontend's history screen.
MAX_STORED_ANALYSES = int(os.environ.get("MAX_STORED_ANALYSES", "200"))


def dataset_dir() -> Path:
    """Challenge data used only by export scripts and regression tests, never by requests."""
    default = BACKEND_ROOT.parent / "NebulaX-Hackathon-ProblemStatement" / "PS3" / "02_Datasets"
    return Path(os.environ.get("NEBULA_DATA_DIR", default))


def reference_predictions_dir() -> Path:
    """Notebook-produced prediction CSVs that the regression tests compare against."""
    default = (
        BACKEND_ROOT.parent
        / "NebulaX-Hackathon-ProblemStatement"
        / "PS3"
        / "FINAL_SUBMISSION"
        / "predictions"
    )
    return Path(os.environ.get("NEBULA_REFERENCE_DIR", default))

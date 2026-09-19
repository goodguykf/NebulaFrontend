"""Shared fixtures: locate the challenge data and notebook reference predictions."""

from __future__ import annotations

from pathlib import Path

import pytest

import config


@pytest.fixture(scope="session")
def data_dir() -> Path:
    path = config.dataset_dir()
    if not path.is_dir():
        pytest.skip(f"challenge data not found at {path} (set NEBULA_DATA_DIR)")
    return path


@pytest.fixture(scope="session")
def reference_dir() -> Path:
    path = config.reference_predictions_dir()
    if not path.is_dir():
        pytest.skip(f"reference predictions not found at {path} (set NEBULA_REFERENCE_DIR)")
    return path


@pytest.fixture()
def client(monkeypatch, tmp_path):
    """Fresh app per test (own in-memory analysis store); models are not warmed."""
    from fastapi.testclient import TestClient

    from main import create_app

    # API-only app, whether or not a frontend build has been copied into the backend.
    monkeypatch.setattr(config, "FRONTEND_DIST", tmp_path / "no_frontend")
    return TestClient(create_app(), raise_server_exceptions=False)

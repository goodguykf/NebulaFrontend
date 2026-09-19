"""Service-level behaviour: health, index, error shapes."""

from __future__ import annotations

import pytest

from api import services
from core.errors import InferenceError, InvalidInputError, ModelArtifactMissingError


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_index_lists_endpoints(client):
    body = client.get("/").json()
    assert set(body["endpoints"]) == {"acv", "door", "rail", "shm"}


def test_web_app_is_served(client):
    response = client.get("/ui")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_invalid_input_from_inference_is_400(client, monkeypatch):
    def reject(files):
        raise InvalidInputError("Invalid Rail CSV 'a.csv': expected 129 columns but received 12.")

    monkeypatch.setattr(services, "run_rail", reject)
    response = client.post("/api/rail/predict", files=[("files", ("a.csv", b"1,2\n", "text/csv"))])
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid Rail CSV 'a.csv': expected 129 columns but received 12."
    assert response.json()["error"] == response.json()["detail"]


def test_missing_artifact_is_500_with_instructions(client, monkeypatch):
    def missing(files):
        raise ModelArtifactMissingError("SHM model artifact not found. Run: python scripts/export_shm_model.py")

    monkeypatch.setattr(services, "run_shm", missing)
    response = client.post("/api/shm/predict", files=[("files", ("a.csv", b"1\n", "text/csv"))])
    assert response.status_code == 500
    assert "export_shm_model.py" in response.json()["detail"]


def _explode(*args):
    raise RuntimeError("secret internal path C:/models/thing.pkl")


def test_inference_guard_replaces_unexpected_errors():
    with pytest.raises(InferenceError) as caught:
        services._guarded("SHM", _explode)
    assert "secret" not in caught.value.message


def test_unexpected_error_hides_internals(client, monkeypatch):
    monkeypatch.setattr(services, "run_shm", _explode)
    response = client.post("/api/shm/predict", files=[("files", ("a.csv", b"1\n", "text/csv"))])
    assert response.status_code == 500
    assert response.json()["detail"] == "Internal server error."
    assert "secret" not in response.text
    assert "Traceback" not in response.text

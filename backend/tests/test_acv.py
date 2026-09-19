"""ACV endpoint: single .xlsx upload -> ranked cars."""

from __future__ import annotations

from pathlib import Path

import pytest

from api import services

RANKING = ["03", "01", "05", "02", "04", "06", "07", "08"]


@pytest.fixture()
def fake_acv(monkeypatch):
    seen: dict[str, Path] = {}

    def run(path: Path, file_id: str) -> dict:
        assert path.is_file(), "upload must exist on disk while inference runs"
        seen["path"] = path
        return {
            "file_id": file_id,
            "ranked_cars": RANKING,
            "ranking_details": [{"car": car, "score": 8.0 - i} for i, car in enumerate(RANKING)],
        }

    monkeypatch.setattr(services, "run_acv", run)
    return seen


def upload(client, name="uploaded_case.xlsx", content=b"PK-fake", **kwargs):
    return client.post("/api/acv/predict", files={"file": (name, content, "application/octet-stream")}, **kwargs)


def test_valid_upload_schema(client, fake_acv):
    response = upload(client)
    assert response.status_code == 200
    body = response.json()
    assert body["subsystem"] == "acv"
    [result] = body["results"]
    assert result["file_id"] == "uploaded_case.xlsx"
    assert result["ranked_cars"] == RANKING
    assert result["ranking_details"][0] == {"car": "03", "score": 8.0}


def test_temp_file_removed_after_request(client, fake_acv):
    upload(client)
    assert not fake_acv["path"].exists()
    assert not fake_acv["path"].parent.parent.exists()


def test_temp_file_removed_when_inference_fails(client, monkeypatch):
    seen: dict[str, Path] = {}

    def run(path: Path, file_id: str) -> dict:
        seen["path"] = path
        raise RuntimeError("boom")

    monkeypatch.setattr(services, "run_acv", run)
    assert upload(client).status_code == 500
    assert not seen["path"].exists()


def test_path_traversal_name_is_neutralised(client, fake_acv):
    response = upload(client, name="../../evil/..\\case.xlsx")
    assert response.status_code == 200
    assert response.json()["results"][0]["file_id"] == "case.xlsx"
    assert fake_acv["path"].name == "case.xlsx"


def test_csv_output(client, fake_acv):
    response = upload(client, params={"format": "csv"})
    assert response.status_code == 200
    assert "acv_predictions.csv" in response.headers["content-disposition"]
    assert response.text == "file_id,ranked_cars\nuploaded_case.xlsx,03|01|05|02|04|06|07|08\n"


def test_wrong_extension(client, fake_acv):
    response = upload(client, name="case.csv")
    assert response.status_code == 400
    assert ".xlsx" in response.json()["detail"]


def test_empty_file(client, fake_acv):
    response = upload(client, content=b"")
    assert response.status_code == 400
    assert "empty" in response.json()["detail"]


def test_missing_file(client):
    response = client.post("/api/acv/predict")
    assert response.status_code == 422
    assert "No file supplied" in response.json()["error"]

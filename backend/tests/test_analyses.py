"""/api/v1 job API used by the Expo frontend: upload -> poll -> result -> CSV download."""

from __future__ import annotations

from pathlib import Path

import pytest

from api import services
from api.analyses import depot_clock_to_iso
from core.errors import InvalidInputError


@pytest.fixture()
def fakes(monkeypatch):
    seen: dict[str, Path] = {}

    def run_rail(files):
        seen["path"] = files[0][1]
        labels = ["Normal", "Normal", "Side II"]
        return [
            {
                "file_id": file_id,
                "prediction": labels[index % 3],
                "probabilities": {"Normal": 0.6, "Side I": 0.1, "Side II": 0.3},
            }
            for index, (file_id, _) in enumerate(files)
        ]

    def run_door(path):
        return [
            {"start_time": "2023-7-5-0-0-0-0", "end_time": "2023-7-5-0-0-3-760", "prediction": "Normal", "confidence": 0.9},
            {
                "start_time": "2023-7-5-0-0-15-5",
                "end_time": "2023-7-5-0-0-18-765",
                "prediction": "Abnormal resistance",
                "confidence": 0.8,
            },
        ]

    def run_acv(path, file_id):
        return {
            "file_id": file_id,
            "ranked_cars": ["03", "01"],
            "ranking_details": [{"car": "03", "score": 2.4}, {"car": "01", "score": 0.1}],
        }

    monkeypatch.setattr(services, "run_rail", run_rail)
    monkeypatch.setattr(services, "run_door", run_door)
    monkeypatch.setattr(services, "run_acv", run_acv)
    monkeypatch.setattr(services, "run_shm", lambda files: [{"file_id": f, "prediction": 0.25} for f, _ in files])
    return seen


def create(client, subsystem, names):
    files = [("files", (name, b"data", "application/octet-stream")) for name in names]
    return client.post("/api/v1/analyses", data={"subsystem": subsystem}, files=files)


def test_health_v1(client):
    assert client.get("/api/v1/health").json() == {"status": "ok"}


def test_rail_job_lifecycle(client, fakes):
    created = create(client, "rail", ["a.csv", "b.csv", "c.csv"])
    assert created.status_code == 202
    assert created.json()["status"] == "queued"

    record = client.get(f"/api/v1/analyses/{created.json()['id']}").json()
    assert record["status"] == "completed"
    assert record["subsystem"] == "rail"
    assert record["filename"] == "a.csv (+2 more)"
    result = record["result"]
    assert result["type"] == "rail"
    assert result["prediction"] == "Normal"
    assert result["statusCounts"] == {"normal": 2, "sideI": 0, "sideII": 1}
    assert [f["fileId"] for f in result["files"]] == ["a.csv", "b.csv", "c.csv"]
    assert result["classScores"]["normal"] == pytest.approx(0.6)
    assert not fakes["path"].exists(), "uploads are deleted once the job ends"


def test_csv_download(client, fakes):
    analysis_id = create(client, "rail", ["a.csv"]).json()["id"]
    response = client.get(f"/api/v1/analyses/{analysis_id}/predictions.csv")
    assert response.status_code == 200
    assert "rail_predictions.csv" in response.headers["content-disposition"]
    assert response.text == "file_id,prediction\na.csv,Normal\n"


def test_door_result_shape(client, fakes):
    analysis_id = create(client, "door", ["door.csv"]).json()["id"]
    result = client.get(f"/api/v1/analyses/{analysis_id}").json()["result"]
    assert (result["totalSegments"], result["normalSegments"], result["abnormalSegments"]) == (2, 1, 1)
    first = result["segments"][0]
    assert first["id"] == "seg_001"
    assert first["startTime"] == "2023-07-05T00:00:00.000Z"
    assert first["rawEndTime"] == "2023-7-5-0-0-3-760"


def test_acv_result_shape(client, fakes):
    analysis_id = create(client, "acv", ["case.xlsx"]).json()["id"]
    result = client.get(f"/api/v1/analyses/{analysis_id}").json()["result"]
    assert result["ranking"] == "03|01"
    assert result["rankedCars"][0] == {"carId": "03", "rank": 1, "score": 2.4}
    assert result["availableMetrics"] == []


def test_failed_job_reports_a_user_message(client, monkeypatch):
    def reject(files):
        raise InvalidInputError("Invalid SHM CSV 'a.csv': no numeric samples.")

    monkeypatch.setattr(services, "run_shm", reject)
    analysis_id = create(client, "shm", ["a.csv"]).json()["id"]
    record = client.get(f"/api/v1/analyses/{analysis_id}").json()
    assert record["status"] == "failed"
    assert record["error"] == "Invalid SHM CSV 'a.csv': no numeric samples."
    assert client.get(f"/api/v1/analyses/{analysis_id}/predictions.csv").status_code == 409


def test_history_is_newest_first_and_filterable(client, fakes):
    create(client, "shm", ["one.csv"])
    create(client, "rail", ["two.csv"])
    everything = client.get("/api/v1/analyses").json()
    assert [r["subsystem"] for r in everything] == ["rail", "shm"]
    assert [r["subsystem"] for r in client.get("/api/v1/analyses?subsystem=shm").json()] == ["shm"]
    assert len(client.get("/api/v1/analyses?limit=1").json()) == 1


def test_rejects_bad_requests(client, fakes):
    assert create(client, "brakes", ["a.csv"]).status_code == 400
    assert create(client, "acv", ["a.csv"]).status_code == 400
    assert create(client, "door", ["a.csv", "b.csv"]).status_code == 400
    assert client.get("/api/v1/analyses/nope").status_code == 404
    assert client.get("/api/v1/analyses/nope").json()["error"] == "Analysis nope was not found."


def test_depot_clock_conversion():
    assert depot_clock_to_iso("2023-7-5-0-20-55-731") == "2023-07-05T00:20:55.731Z"
    assert depot_clock_to_iso("not a time") == "not a time"

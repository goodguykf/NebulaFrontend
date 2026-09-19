"""Door endpoint: one continuous .csv -> many classified segments."""

from __future__ import annotations

from pathlib import Path

import pytest

from api import services

SEGMENTS = [
    {"start_time": "2023-7-5-0-0-0-0", "end_time": "2023-7-5-0-0-3-760", "prediction": "Normal", "confidence": 0.923},
    {
        "start_time": "2023-7-5-0-0-15-5",
        "end_time": "2023-7-5-0-0-18-765",
        "prediction": "Abnormal resistance",
        "confidence": 0.91,
    },
]


@pytest.fixture()
def fake_door(monkeypatch):
    def run(path: Path) -> list[dict]:
        assert path.is_file()
        return SEGMENTS

    monkeypatch.setattr(services, "run_door", run)


def upload(client, name="door_data.csv", content=b"Datetime,Current\n", **kwargs):
    return client.post("/api/door/predict", files={"file": (name, content, "text/csv")}, **kwargs)


def test_valid_upload_returns_multiple_segments(client, fake_door):
    response = upload(client)
    assert response.status_code == 200
    body = response.json()
    assert body["subsystem"] == "door"
    assert body["file_id"] == "door_data.csv"
    assert body["segments"] == SEGMENTS


def test_csv_output_uses_official_three_columns(client, fake_door):
    text = upload(client, params={"format": "csv"}).text
    assert text.splitlines()[0] == "start_time,end_time,prediction"
    assert text.splitlines()[2] == "2023-7-5-0-0-15-5,2023-7-5-0-0-18-765,Abnormal resistance"


def test_csv_output_with_confidence(client, fake_door):
    text = upload(client, params={"format": "csv", "confidence": "true"}).text
    assert text.splitlines()[0] == "start_time,end_time,prediction,confidence"
    assert text.splitlines()[1].endswith(",Normal,0.923")


def test_wrong_extension(client, fake_door):
    assert upload(client, name="door.xlsx").status_code == 400


def test_missing_file(client):
    assert client.post("/api/door/predict").status_code == 422

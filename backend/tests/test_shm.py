"""SHM endpoint: one or many .csv recordings -> one damage value per file."""

from __future__ import annotations

import numpy as np
import pytest

from api import services


@pytest.fixture()
def fake_shm(monkeypatch):
    def run(files):
        return [{"file_id": file_id, "prediction": 0.039005 + index} for index, (file_id, _) in enumerate(files)]

    monkeypatch.setattr(services, "run_shm", run)


def upload(client, names, **kwargs):
    files = [("files", (name, b"stress\n1.0\n", "text/csv")) for name in names]
    return client.post("/api/shm/predict", files=files, **kwargs)


def test_single_file(client, fake_shm):
    response = upload(client, ["test01.csv"])
    assert response.status_code == 200
    assert response.json() == {"subsystem": "shm", "results": [{"file_id": "test01.csv", "prediction": 0.039005}]}


def test_multiple_files(client, fake_shm):
    names = [f"any_name_{i}.csv" for i in range(7)]
    results = upload(client, names).json()["results"]
    assert [r["file_id"] for r in results] == names
    assert all(isinstance(r["prediction"], float) for r in results)


def test_numpy_values_are_serialised(client, monkeypatch):
    monkeypatch.setattr(services, "run_shm", lambda files: [{"file_id": "a.csv", "prediction": np.float64(0.5)}])
    response = upload(client, ["a.csv"])
    assert response.status_code == 200
    assert response.json()["results"][0]["prediction"] == 0.5


def test_csv_output_keeps_full_precision(client, monkeypatch):
    value = 0.032777485907123094
    monkeypatch.setattr(services, "run_shm", lambda files: [{"file_id": "test01.csv", "prediction": value}])
    text = upload(client, ["test01.csv"], params={"format": "csv"}).text
    assert text == "file_id,prediction\ntest01.csv,0.032777485907123094\n"


def test_wrong_extension(client, fake_shm):
    assert upload(client, ["stress.xlsx"]).status_code == 400


def test_missing_files(client):
    assert client.post("/api/shm/predict").status_code == 422

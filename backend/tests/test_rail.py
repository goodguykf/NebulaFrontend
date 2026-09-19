"""Rail endpoint: one or many .csv recordings -> one prediction per file."""

from __future__ import annotations

import pytest

from api import services


@pytest.fixture()
def fake_rail(monkeypatch):
    calls: list[int] = []

    def run(files):
        calls.append(len(files))
        assert all(path.is_file() for _, path in files)
        return [
            {
                "file_id": file_id,
                "prediction": "Side II" if index % 2 else "Normal",
                "probabilities": {"Normal": 0.07, "Side I": 0.08, "Side II": 0.85},
            }
            for index, (file_id, _) in enumerate(files)
        ]

    monkeypatch.setattr(services, "run_rail", run)
    return calls


def upload(client, names, **kwargs):
    files = [("files", (name, b"1,2,3\n", "text/csv")) for name in names]
    return client.post("/api/rail/predict", files=files, **kwargs)


def test_single_file(client, fake_rail):
    response = upload(client, ["rail_a.csv"])
    assert response.status_code == 200
    [result] = response.json()["results"]
    assert result["file_id"] == "rail_a.csv"
    assert set(result["probabilities"]) == {"Normal", "Side I", "Side II"}


@pytest.mark.parametrize("count", [2, 5, 20])
def test_multiple_files_one_result_each_in_order(client, fake_rail, count):
    names = [f"rec_{i}.csv" for i in range(count)]
    response = upload(client, names)
    assert response.status_code == 200
    assert [r["file_id"] for r in response.json()["results"]] == names
    assert fake_rail == [count], "all files go to the model in one batch"


def test_duplicate_file_names_do_not_collide(client, fake_rail):
    response = upload(client, ["same.csv", "same.csv"])
    assert response.status_code == 200
    assert len(response.json()["results"]) == 2


def test_csv_output(client, fake_rail):
    text = upload(client, ["a.csv", "b.csv"], params={"format": "csv"}).text
    assert text == "file_id,prediction\na.csv,Normal\nb.csv,Side II\n"


def test_one_bad_extension_rejects_the_request(client, fake_rail):
    response = upload(client, ["a.csv", "notes.txt"])
    assert response.status_code == 400
    assert "notes.txt" in response.json()["detail"]
    assert fake_rail == []


def test_missing_files(client):
    assert client.post("/api/rail/predict").status_code == 422

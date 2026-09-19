"""Optional hosting of the exported Expo web build next to the API."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import config


@pytest.fixture()
def hosted_client(monkeypatch, tmp_path):
    dist = tmp_path / "frontend_dist"
    (dist / "_expo").mkdir(parents=True)
    (dist / "index.html").write_text("<html>rail app</html>", encoding="utf-8")
    (dist / "_expo" / "app.js").write_text("console.log('app')", encoding="utf-8")
    (tmp_path / "secret.txt").write_text("outside the build", encoding="utf-8")
    monkeypatch.setattr(config, "FRONTEND_DIST", dist)

    from main import create_app

    return TestClient(create_app(), raise_server_exceptions=False)


def test_root_serves_the_app_and_index_moves_to_api(hosted_client):
    assert "rail app" in hosted_client.get("/").text
    assert "endpoints" in hosted_client.get("/api").json()


def test_static_assets_and_client_routes(hosted_client):
    assert "console.log" in hosted_client.get("/_expo/app.js").text
    # expo-router paths are resolved in the browser, so they get the app shell.
    assert "rail app" in hosted_client.get("/subsystem/rail/analysis_rail_123").text


def test_api_routes_still_win(hosted_client):
    assert hosted_client.get("/health").json() == {"status": "ok"}
    assert hosted_client.get("/api/v1/health").json() == {"status": "ok"}
    assert hosted_client.get("/api/unknown").status_code == 404


def test_cannot_escape_the_build_folder(hosted_client):
    response = hosted_client.get("/%2e%2e/secret.txt")
    assert "outside the build" not in response.text

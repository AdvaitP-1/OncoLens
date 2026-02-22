"""Basic API integration tests."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint():
    """Verify /health returns ok."""
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "time" in data
    assert "version" in data


def test_run_case_nonexistent_returns_404():
    """Verify /cases/{id}/run returns 404 for nonexistent case."""
    client = TestClient(app)
    resp = client.post(
        "/cases/00000000-0000-0000-0000-000000000000/run",
        json={"lambda": 0.6},
    )
    assert resp.status_code == 404

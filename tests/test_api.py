"""Integration tests for FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from data import load_default_station_data

client = TestClient(app)


def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "railflow-backend"
    assert "version" in data


def test_api_timetable():
    response = client.get("/api/timetable")
    assert response.status_code == 200
    data = response.json()
    assert data["station_id"] == "STN_CENTRAL"
    assert len(data["platforms"]) == 4
    assert len(data["trains"]) >= 8


def test_api_validate_valid():
    default_data = load_default_station_data()
    response = client.post("/api/validate", json={"timetable": default_data})
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert len(data["errors"]) == 0
    assert data["summary"]["conflict_count"] == 0


def test_api_validate_direct_timetable():
    default_data = load_default_station_data()
    # Direct payload without wrapping {"timetable": ...}
    response = client.post("/api/validate", json=default_data)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True


def test_api_validate_conflict():
    default_data = load_default_station_data()
    # Cause a conflict: assign train T102 to P1 with overlapping time (610-630, while T101 is 600-615 on P1)
    default_data["trains"][1]["assigned_platform"] = "P1"
    default_data["trains"][1]["arrival_time"] = 610
    default_data["trains"][1]["departure_time"] = 630
    response = client.post("/api/validate", json=default_data)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is False
    assert len(data["errors"]) > 0
    codes = [e["code"] for e in data["errors"]]
    assert "PLATFORM_OVERLAP" in codes


def test_api_validate_malformed():
    response = client.post("/api/validate", json={"station_id": 12345, "trains": "not-a-list"})
    assert response.status_code == 400


def test_api_disruptions_parse():
    text = "Train T12 delayed 20 min. Platform P2 closed 10:00-11:00"
    response = client.post("/api/disruptions/parse", json={"text": text})
    assert response.status_code == 200
    data = response.json()
    assert len(data["disruptions"]) == 2
    assert data["needs_confirmation"] is True


def test_api_disruptions_parse_empty():
    response = client.post("/api/disruptions/parse", json={"text": "   "})
    assert response.status_code == 400


def test_api_disruptions_apply_success():
    response = client.post(
        "/api/disruptions/apply",
        json={
            "disruptions": [
                {
                    "type": "train_delay",
                    "train_id": "T101",
                    "delay_minutes": 15,
                }
            ]
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["timetable"] is not None
    assert len(data["changes"]) > 0
    assert data["validation"]["is_valid"] is True


def test_api_disruptions_apply_platform_closure():
    response = client.post(
        "/api/disruptions/apply",
        json={
            "disruptions": [
                {
                    "type": "platform_closure",
                    "platform_id": "P2",
                    "start_time": 600,
                    "end_time": 660,
                }
            ]
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["timetable"] is not None
    # No train should be on P2 during 600-660
    for t in data["timetable"]["trains"]:
        if t["assigned_platform"] == "P2":
            assert not (max(t["arrival_time"], 600) < min(t["departure_time"], 660))


def test_api_disruptions_apply_no_solution():
    # Close all 4 platforms during the entire morning period
    response = client.post(
        "/api/disruptions/apply",
        json={
            "disruptions": [
                {"type": "platform_closure", "platform_id": "P1", "start_time": 500, "end_time": 800},
                {"type": "platform_closure", "platform_id": "P2", "start_time": 500, "end_time": 800},
                {"type": "platform_closure", "platform_id": "P3", "start_time": 500, "end_time": 800},
                {"type": "platform_closure", "platform_id": "P4", "start_time": 500, "end_time": 800},
            ]
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "no_solution"
    assert data["timetable"] is None
    assert len(data["changes"]) == 0


def test_api_disruptions_apply_unknown_train():
    response = client.post(
        "/api/disruptions/apply",
        json={
            "disruptions": [
                {
                    "type": "train_delay",
                    "train_id": "T9999",
                    "delay_minutes": 20,
                }
            ]
        },
    )
    assert response.status_code == 400
    assert "Unknown train identifier" in response.json()["detail"]


def test_api_disruptions_apply_unknown_platform():
    response = client.post(
        "/api/disruptions/apply",
        json={
            "disruptions": [
                {
                    "type": "platform_closure",
                    "platform_id": "P999",
                    "start_time": 600,
                    "end_time": 660,
                }
            ]
        },
    )
    assert response.status_code == 400
    assert "Unknown platform identifier" in response.json()["detail"]


def test_api_cors_preflight():
    response = client.options(
        "/api/timetable",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"

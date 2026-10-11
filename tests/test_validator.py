"""Tests for independent timetable validator."""

import pytest
from app.models import Platform, Train, PlatformClosure, Timetable
from app.validator import validate_timetable


def test_validator_valid_timetable():
    timetable = Timetable(
        station_id="STN_TEST",
        station_name="Test Central",
        minimum_gap_minutes=5,
        platforms=[
            Platform(platform_id="P1", name="Platform 1"),
            Platform(platform_id="P2", name="Platform 2"),
        ],
        trains=[
            Train(train_id="T1", name="Train 1", arrival_time=600, departure_time=620, assigned_platform="P1"),
            Train(train_id="T2", name="Train 2", arrival_time=625, departure_time=645, assigned_platform="P1"),
            Train(train_id="T3", name="Train 3", arrival_time=600, departure_time=630, assigned_platform="P2"),
        ],
        platform_closures=[],
    )
    result = validate_timetable(timetable)
    assert result.is_valid is True
    assert len(result.errors) == 0
    assert result.summary.conflict_count == 0


def test_validator_duplicate_identifiers():
    timetable = Timetable(
        station_id="STN_TEST",
        station_name="Test Central",
        minimum_gap_minutes=5,
        platforms=[
            Platform(platform_id="P1", name="Platform 1"),
            Platform(platform_id="P1", name="Platform 1 duplicate"),
        ],
        trains=[
            Train(train_id="T1", name="Train 1", arrival_time=600, departure_time=620, assigned_platform="P1"),
            Train(train_id="T1", name="Train 1 duplicate", arrival_time=630, departure_time=650, assigned_platform="P1"),
        ],
    )
    result = validate_timetable(timetable)
    assert result.is_valid is False
    error_codes = [e.code for e in result.errors]
    assert "DUPLICATE_PLATFORM_ID" in error_codes
    assert "DUPLICATE_TRAIN_ID" in error_codes


def test_validator_invalid_intervals():
    timetable = Timetable(
        station_id="STN_TEST",
        station_name="Test Central",
        minimum_gap_minutes=5,
        platforms=[Platform(platform_id="P1", name="Platform 1")],
        trains=[
            Train(train_id="T1", name="Train 1", arrival_time=620, departure_time=600, assigned_platform="P1"),  # arr >= dep
            Train(train_id="T2", name="Train 2", arrival_time=-10, departure_time=600, assigned_platform="P1"), # negative
        ],
        platform_closures=[
            PlatformClosure(platform_id="P1", start_time=700, end_time=650), # invalid closure
        ],
    )
    result = validate_timetable(timetable)
    assert result.is_valid is False
    error_codes = [e.code for e in result.errors]
    assert "INVALID_INTERVAL" in error_codes
    assert "INVALID_CLOSURE_INTERVAL" in error_codes


def test_validator_unassigned_and_unknown_platforms():
    timetable = Timetable(
        station_id="STN_TEST",
        station_name="Test Central",
        minimum_gap_minutes=5,
        platforms=[
            Platform(platform_id="P1", name="Platform 1"),
            Platform(platform_id="P2", name="Platform 2", is_active=False),
        ],
        trains=[
            Train(train_id="T1", name="Train 1", arrival_time=600, departure_time=620, assigned_platform=None),
            Train(train_id="T2", name="Train 2", arrival_time=600, departure_time=620, assigned_platform="P99"),
            Train(train_id="T3", name="Train 3", arrival_time=600, departure_time=620, assigned_platform="P2"),
        ],
    )
    result = validate_timetable(timetable)
    assert result.is_valid is False
    error_codes = [e.code for e in result.errors]
    assert "UNASSIGNED_PLATFORM" in error_codes
    assert "UNKNOWN_PLATFORM" in error_codes
    assert "INACTIVE_PLATFORM" in error_codes


def test_validator_platform_overlap():
    timetable = Timetable(
        station_id="STN_TEST",
        station_name="Test Central",
        minimum_gap_minutes=5,
        platforms=[Platform(platform_id="P1", name="Platform 1")],
        trains=[
            Train(train_id="T1", name="Train 1", arrival_time=600, departure_time=620, assigned_platform="P1"),
            Train(train_id="T2", name="Train 2", arrival_time=615, departure_time=635, assigned_platform="P1"),
        ],
    )
    result = validate_timetable(timetable)
    assert result.is_valid is False
    error_codes = [e.code for e in result.errors]
    assert "PLATFORM_OVERLAP" in error_codes


def test_validator_minimum_gap_violation():
    timetable = Timetable(
        station_id="STN_TEST",
        station_name="Test Central",
        minimum_gap_minutes=5,
        platforms=[Platform(platform_id="P1", name="Platform 1")],
        trains=[
            Train(train_id="T1", name="Train 1", arrival_time=600, departure_time=620, assigned_platform="P1"),
            # T2 arrives at 622, only 2 min gap after 620, but min gap is 5
            Train(train_id="T2", name="Train 2", arrival_time=622, departure_time=640, assigned_platform="P1"),
        ],
    )
    result = validate_timetable(timetable)
    assert result.is_valid is False
    error_codes = [e.code for e in result.errors]
    assert "MINIMUM_GAP_VIOLATION" in error_codes
    overlap_item = next(e for e in result.errors if e.code == "MINIMUM_GAP_VIOLATION")
    assert overlap_item.platform_id == "P1"
    assert "T1" in overlap_item.train_ids and "T2" in overlap_item.train_ids


def test_validator_platform_closure_conflict():
    timetable = Timetable(
        station_id="STN_TEST",
        station_name="Test Central",
        minimum_gap_minutes=5,
        platforms=[Platform(platform_id="P1", name="Platform 1")],
        trains=[
            Train(train_id="T1", name="Train 1", arrival_time=610, departure_time=640, assigned_platform="P1"),
        ],
        platform_closures=[
            PlatformClosure(platform_id="P1", start_time=600, end_time=630, reason="Track repair"),
        ],
    )
    result = validate_timetable(timetable)
    assert result.is_valid is False
    error_codes = [e.code for e in result.errors]
    assert "CLOSED_PLATFORM_CONFLICT" in error_codes


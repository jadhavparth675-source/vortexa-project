"""Tests for deterministic scheduling solver."""

import pytest
from app.models import Platform, Train, PlatformClosure, Timetable, Disruption
from app.solver import plan_schedule, ScheduleSolver


def test_solver_initial_allocation():
    # Trains with no initial platform assignment
    timetable = Timetable(
        station_id="STN_TEST",
        station_name="Test Station",
        minimum_gap_minutes=5,
        platforms=[
            Platform(platform_id="P1", name="Platform 1"),
            Platform(platform_id="P2", name="Platform 2"),
        ],
        trains=[
            Train(train_id="T1", name="Train 1", arrival_time=600, departure_time=620, assigned_platform=None),
            Train(train_id="T2", name="Train 2", arrival_time=600, departure_time=620, assigned_platform=None),
        ],
        platform_closures=[],
    )
    status, msg, revised, changes = plan_schedule(timetable, disruptions=[])
    assert status == "success"
    assert revised is not None
    assert len(changes) == 2
    # The two trains should be on different platforms
    platforms_used = {t.assigned_platform for t in revised.trains}
    assert len(platforms_used) == 2
    assert "P1" in platforms_used and "P2" in platforms_used


def test_solver_train_delay_replanning():
    # T1 on P1 (600-620), T2 on P1 (630-650).
    # If T1 delayed by 20 min -> T1 becomes (620-640), which overlaps with T2 on P1!
    timetable = Timetable(
        station_id="STN_TEST",
        station_name="Test Station",
        minimum_gap_minutes=5,
        platforms=[
            Platform(platform_id="P1", name="Platform 1"),
            Platform(platform_id="P2", name="Platform 2"),
        ],
        trains=[
            Train(train_id="T1", name="Train 1", arrival_time=600, departure_time=620, assigned_platform="P1"),
            Train(train_id="T2", name="Train 2", arrival_time=630, departure_time=650, assigned_platform="P1"),
        ],
        platform_closures=[],
    )
    disruptions = [
        Disruption(type="train_delay", train_id="T1", delay_minutes=20, reason="Signaling fault")
    ]
    status, msg, revised, changes = plan_schedule(timetable, disruptions)
    assert status == "success"
    assert revised is not None

    t1_rev = next(t for t in revised.trains if t.train_id == "T1")
    t2_rev = next(t for t in revised.trains if t.train_id == "T2")

    assert t1_rev.arrival_time == 620
    assert t1_rev.departure_time == 640
    # Because T1 and T2 overlap during 630-640 on P1, one of them must have moved to P2!
    assert t1_rev.assigned_platform != t2_rev.assigned_platform
    # Meaningful reasons in changes
    assert any("Delayed by 20 min" in c.reason for c in changes)


def test_solver_temporary_platform_closure():
    timetable = Timetable(
        station_id="STN_TEST",
        station_name="Test Station",
        minimum_gap_minutes=5,
        platforms=[
            Platform(platform_id="P1", name="Platform 1"),
            Platform(platform_id="P2", name="Platform 2"),
        ],
        trains=[
            Train(train_id="T1", name="Train 1", arrival_time=600, departure_time=620, assigned_platform="P1"),
        ],
        platform_closures=[],
    )
    # Closure on P1 from 590 to 630
    disruptions = [
        Disruption(type="platform_closure", platform_id="P1", start_time=590, end_time=630, reason="Track inspection")
    ]
    status, msg, revised, changes = plan_schedule(timetable, disruptions)
    assert status == "success"
    assert revised is not None

    t1_rev = revised.trains[0]
    assert t1_rev.assigned_platform == "P2"
    assert any(c.change_type == "platform_reassigned" for c in changes)
    assert any("P1 is closed" in c.reason for c in changes)


def test_solver_preserves_unaffected_trains():
    # T1 on P1, T2 on P2.
    # Closure on P1 affects T1, but T2 on P2 is unaffected (if P3 is available for T1)
    timetable = Timetable(
        station_id="STN_TEST",
        station_name="Test Station",
        minimum_gap_minutes=5,
        platforms=[
            Platform(platform_id="P1", name="Platform 1"),
            Platform(platform_id="P2", name="Platform 2"),
            Platform(platform_id="P3", name="Platform 3"),
        ],
        trains=[
            Train(train_id="T1", name="Train 1", arrival_time=600, departure_time=620, assigned_platform="P1"),
            Train(train_id="T2", name="Train 2", arrival_time=600, departure_time=620, assigned_platform="P2"),
        ],
        platform_closures=[],
    )
    disruptions = [
        Disruption(type="platform_closure", platform_id="P1", start_time=590, end_time=630)
    ]
    status, msg, revised, changes = plan_schedule(timetable, disruptions)
    assert status == "success"
    assert revised is not None

    t2_rev = next(t for t in revised.trains if t.train_id == "T2")
    # T2 should remain on P2!
    assert t2_rev.assigned_platform == "P2"
    # Only T1 should be in reassigned changes
    reassigned_trains = [c.train_id for c in changes if c.change_type == "platform_reassigned"]
    assert "T2" not in reassigned_trains
    assert "T1" in reassigned_trains


def test_solver_no_solution_when_all_platforms_closed():
    timetable = Timetable(
        station_id="STN_TEST",
        station_name="Test Station",
        minimum_gap_minutes=5,
        platforms=[
            Platform(platform_id="P1", name="Platform 1"),
        ],
        trains=[
            Train(train_id="T1", name="Train 1", arrival_time=600, departure_time=620, assigned_platform="P1"),
        ],
        platform_closures=[],
    )
    disruptions = [
        Disruption(type="platform_closure", platform_id="P1", start_time=590, end_time=630)
    ]
    status, msg, revised, changes = plan_schedule(timetable, disruptions)
    assert status == "no_solution"
    assert revised is None
    assert len(changes) == 0


def test_solver_no_solution_when_oversubscribed():
    # 2 simultaneous trains with only 1 platform available
    timetable = Timetable(
        station_id="STN_TEST",
        station_name="Test Station",
        minimum_gap_minutes=5,
        platforms=[
            Platform(platform_id="P1", name="Platform 1"),
        ],
        trains=[
            Train(train_id="T1", name="Train 1", arrival_time=600, departure_time=620, assigned_platform="P1"),
            Train(train_id="T2", name="Train 2", arrival_time=605, departure_time=625, assigned_platform="P1"),
        ],
        platform_closures=[],
    )
    status, msg, revised, changes = plan_schedule(timetable, disruptions=[])
    assert status == "no_solution"
    assert revised is None


def test_solver_validator_rejection(monkeypatch):
    from app.models import ValidationResponse, ValidationErrorItem, ValidationSummary
    import app.solver

    # Mock validator to simulate finding an integrity violation
    def mock_validate(tt):
        return ValidationResponse(
            is_valid=False,
            errors=[
                ValidationErrorItem(
                    code="PLATFORM_OVERLAP",
                    message="Simulated validation failure",
                    platform_id="P1",
                )
            ],
            summary=ValidationSummary(
                total_trains=len(tt.trains),
                total_platforms=len(tt.platforms),
                total_closures=len(tt.platform_closures),
                conflict_count=1,
            ),
        )

    monkeypatch.setattr(app.solver, "validate_timetable", mock_validate)

    timetable = Timetable(
        station_id="STN_TEST",
        station_name="Test Station",
        minimum_gap_minutes=5,
        platforms=[Platform(platform_id="P1", name="Platform 1")],
        trains=[
            Train(train_id="T1", name="Train 1", arrival_time=600, departure_time=620, assigned_platform="P1")
        ],
        platform_closures=[],
    )
    status, msg, revised, changes = plan_schedule(timetable, disruptions=[])
    assert status == "no_solution"
    assert revised is None
    assert "Proposed schedule failed independent validation" in msg


"""Independent timetable validation module.

This module MUST NOT import or reuse the solver's scheduling or conflict-checking logic.
It independently inspects a timetable to verify all integrity, platform, timing,
closure, and minimum-gap constraints.
"""

from typing import List, Set, Dict, Any
from app.models import (
    Timetable,
    ValidationResponse,
    ValidationErrorItem,
    ValidationSummary,
)


def validate_timetable(timetable: Timetable) -> ValidationResponse:
    """Independently validates a timetable object according to railway rules."""
    errors: List[ValidationErrorItem] = []
    warnings: List[str] = []

    # 1. Check duplicate platform IDs
    seen_platform_ids: Set[str] = set()
    duplicate_platform_ids: Set[str] = set()
    platform_map: Dict[str, Any] = {}
    inactive_platform_ids: Set[str] = set()

    for p in timetable.platforms:
        if p.platform_id in seen_platform_ids:
            duplicate_platform_ids.add(p.platform_id)
        seen_platform_ids.add(p.platform_id)
        platform_map[p.platform_id] = p
        if not p.is_active:
            inactive_platform_ids.add(p.platform_id)

    for pid in sorted(duplicate_platform_ids):
        errors.append(
            ValidationErrorItem(
                code="DUPLICATE_PLATFORM_ID",
                message=f"Duplicate platform ID '{pid}' detected in platforms list.",
                platform_id=pid,
            )
        )

    # 2. Check duplicate train IDs
    seen_train_ids: Set[str] = set()
    duplicate_train_ids: Set[str] = set()
    for t in timetable.trains:
        if t.train_id in seen_train_ids:
            duplicate_train_ids.add(t.train_id)
        seen_train_ids.add(t.train_id)

    for tid in sorted(duplicate_train_ids):
        errors.append(
            ValidationErrorItem(
                code="DUPLICATE_TRAIN_ID",
                message=f"Duplicate train ID '{tid}' detected in timetable.",
                train_ids=[tid],
            )
        )

    # 3. Check train timing intervals & platform assignments
    platform_trains_map: Dict[str, List[Any]] = {pid: [] for pid in seen_platform_ids}

    for t in timetable.trains:
        # Check interval validity
        if t.arrival_time < 0 or t.departure_time < 0:
            errors.append(
                ValidationErrorItem(
                    code="INVALID_INTERVAL",
                    message=f"Train {t.train_id} has negative time values (arr={t.arrival_time}, dep={t.departure_time}).",
                    train_ids=[t.train_id],
                    conflict_time_start=t.arrival_time,
                    conflict_time_end=t.departure_time,
                )
            )
        elif t.arrival_time >= t.departure_time:
            errors.append(
                ValidationErrorItem(
                    code="INVALID_INTERVAL",
                    message=f"Train {t.train_id} has invalid interval: arrival ({t.arrival_time}) must be strictly earlier than departure ({t.departure_time}).",
                    train_ids=[t.train_id],
                    conflict_time_start=t.arrival_time,
                    conflict_time_end=t.departure_time,
                )
            )

        # Check platform assignment
        if not t.assigned_platform:
            errors.append(
                ValidationErrorItem(
                    code="UNASSIGNED_PLATFORM",
                    message=f"Train {t.train_id} has no assigned platform.",
                    train_ids=[t.train_id],
                )
            )
        elif t.assigned_platform not in seen_platform_ids:
            errors.append(
                ValidationErrorItem(
                    code="UNKNOWN_PLATFORM",
                    message=f"Train {t.train_id} is assigned to unknown platform '{t.assigned_platform}'.",
                    platform_id=t.assigned_platform,
                    train_ids=[t.train_id],
                )
            )
        elif t.assigned_platform in inactive_platform_ids:
            errors.append(
                ValidationErrorItem(
                    code="INACTIVE_PLATFORM",
                    message=f"Train {t.train_id} is assigned to inactive platform '{t.assigned_platform}'.",
                    platform_id=t.assigned_platform,
                    train_ids=[t.train_id],
                )
            )
        else:
            platform_trains_map[t.assigned_platform].append(t)

    # 4. Check platform closures
    closures_by_platform: Dict[str, List[Any]] = {pid: [] for pid in seen_platform_ids}
    for c in timetable.platform_closures:
        if c.platform_id not in seen_platform_ids:
            errors.append(
                ValidationErrorItem(
                    code="UNKNOWN_PLATFORM",
                    message=f"Platform closure references unknown platform '{c.platform_id}'.",
                    platform_id=c.platform_id,
                )
            )
            continue

        if c.start_time < 0 or c.end_time < 0 or c.start_time >= c.end_time:
            errors.append(
                ValidationErrorItem(
                    code="INVALID_CLOSURE_INTERVAL",
                    message=f"Platform closure on '{c.platform_id}' has invalid interval [{c.start_time}, {c.end_time}].",
                    platform_id=c.platform_id,
                    conflict_time_start=c.start_time,
                    conflict_time_end=c.end_time,
                )
            )
            continue

        closures_by_platform[c.platform_id].append(c)

    # Check for train conflicts with closures
    for pid, closures in closures_by_platform.items():
        trains_on_p = platform_trains_map.get(pid, [])
        for c in closures:
            for t in trains_on_p:
                if t.arrival_time < t.departure_time:
                    # Check overlap between [t.arr, t.dep] and [c.start, c.end]
                    overlap_start = max(t.arrival_time, c.start_time)
                    overlap_end = min(t.departure_time, c.end_time)
                    if overlap_start < overlap_end:
                        errors.append(
                            ValidationErrorItem(
                                code="CLOSED_PLATFORM_CONFLICT",
                                message=f"Train {t.train_id} occupies Platform {pid} during closure interval [{c.start_time}, {c.end_time}].",
                                platform_id=pid,
                                train_ids=[t.train_id],
                                conflict_time_start=overlap_start,
                                conflict_time_end=overlap_end,
                            )
                        )

    # 5. Check platform overlaps and minimum-gap violations
    gap_min = max(0, timetable.minimum_gap_minutes)

    for pid, trains in platform_trains_map.items():
        if len(trains) == 0:
            warnings.append(f"Platform {pid} has no trains scheduled.")
            continue

        # Sort trains by arrival time
        sorted_trains = sorted(trains, key=lambda tr: (tr.arrival_time, tr.departure_time))
        for i in range(len(sorted_trains)):
            t1 = sorted_trains[i]
            if t1.arrival_time >= t1.departure_time:
                continue

            for j in range(i + 1, len(sorted_trains)):
                t2 = sorted_trains[j]
                if t2.arrival_time >= t2.departure_time:
                    continue

                # Case A: Direct overlap
                if t2.arrival_time < t1.departure_time:
                    errors.append(
                        ValidationErrorItem(
                            code="PLATFORM_OVERLAP",
                            message=f"Trains {t1.train_id} and {t2.train_id} have overlapping occupancy on Platform {pid}.",
                            platform_id=pid,
                            train_ids=[t1.train_id, t2.train_id],
                            conflict_time_start=t2.arrival_time,
                            conflict_time_end=min(t1.departure_time, t2.departure_time),
                        )
                    )
                # Case B: Minimum gap violation
                elif t2.arrival_time < t1.departure_time + gap_min:
                    actual_gap = t2.arrival_time - t1.departure_time
                    errors.append(
                        ValidationErrorItem(
                            code="MINIMUM_GAP_VIOLATION",
                            message=f"Gap between Train {t1.train_id} and Train {t2.train_id} on Platform {pid} is {actual_gap} min, less than required minimum {gap_min} min.",
                            platform_id=pid,
                            train_ids=[t1.train_id, t2.train_id],
                            conflict_time_start=t1.departure_time,
                            conflict_time_end=t2.arrival_time,
                        )
                    )

    summary = ValidationSummary(
        total_trains=len(timetable.trains),
        total_platforms=len(timetable.platforms),
        total_closures=len(timetable.platform_closures),
        conflict_count=len(errors),
    )

    return ValidationResponse(
        is_valid=(len(errors) == 0),
        errors=errors,
        warnings=warnings,
        summary=summary,
    )


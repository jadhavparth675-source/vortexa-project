"""Deterministic constraint-based scheduling solver.

Implements greedy assignment with backtracking for initial platform allocation
and disruption replanning.
Enforces:
- No overlapping train occupancy on a platform.
- Minimum gap between consecutive trains on each platform.
- No occupancy on closed platforms during closure intervals.
- Delays update arrival and departure times (preserving dwell time).
- Preservation of unaffected train assignments whenever feasible.
- Meaningful reason logging for every change.
"""

from typing import List, Dict, Tuple, Optional, Set
import copy

from app.models import (
    Timetable,
    Train,
    PlatformClosure,
    Disruption,
    TimetableChange,
    minutes_to_hhmm,
)
from app.validator import validate_timetable


def times_overlap(
    arr1: int, dep1: int, arr2: int, dep2: int, min_gap: int = 0
) -> bool:
    """Returns True if two train intervals overlap or violate the minimum gap.

    Semantics:
    Train 1 occupies [arr1, dep1]. Train 2 occupies [arr2, dep2].
    If arr1 <= arr2:
      Conflict occurs if arr2 < dep1 + min_gap.
    If arr2 < arr1:
      Conflict occurs if arr1 < dep2 + min_gap.
    """
    if arr1 <= arr2:
        return arr2 < dep1 + min_gap
    else:
        return arr1 < dep2 + min_gap


def overlaps_closure(arr: int, dep: int, start: int, end: int) -> bool:
    """Returns True if [arr, dep] overlaps with closure [start, end]."""
    return max(arr, start) < min(dep, end)


def is_valid_assignment_for_train(
    train: Train,
    platform_id: str,
    assigned_trains_on_platform: List[Train],
    closures_on_platform: List[PlatformClosure],
    min_gap: int,
) -> bool:
    """Checks whether placing `train` on `platform_id` violates closures or conflicts with existing trains."""
    # Check closure conflicts
    for c in closures_on_platform:
        if overlaps_closure(train.arrival_time, train.departure_time, c.start_time, c.end_time):
            return False

    # Check conflict with trains already assigned to this platform
    for other in assigned_trains_on_platform:
        if times_overlap(
            train.arrival_time,
            train.departure_time,
            other.arrival_time,
            other.departure_time,
            min_gap=min_gap,
        ):
            return False

    return True


class ScheduleSolver:
    """Deterministic constraint-based solver with greedy priority and backtracking."""

    def __init__(self, timetable: Timetable):
        self.original_timetable = timetable
        self.min_gap = max(0, timetable.minimum_gap_minutes)
        self.active_platforms = [p.platform_id for p in timetable.platforms if p.is_active]
        self.active_platforms.sort()

    def solve(
        self,
        trains: List[Train],
        closures: List[PlatformClosure],
        original_assignments: Dict[str, Optional[str]],
    ) -> Optional[Dict[str, str]]:
        """Finds a conflict-free platform assignment minimizing changes from original_assignments.

        Returns a dictionary mapping train_id -> platform_id, or None if impossible.
        """
        if not self.active_platforms and trains:
            return None

        # Group closures by platform
        closures_by_p: Dict[str, List[PlatformClosure]] = {p: [] for p in self.active_platforms}
        for c in closures:
            if c.platform_id in closures_by_p:
                closures_by_p[c.platform_id].append(c)

        # Sort trains deterministically by arrival time, then departure time, then train_id
        sorted_trains = sorted(trains, key=lambda t: (t.arrival_time, t.departure_time, t.train_id))

        # Best solution tracker: (min_changes, assignment_dict)
        best_solution: List[Optional[Dict[str, str]]] = [None]
        min_reassignments: List[int] = [len(sorted_trains) + 1]

        # Branch-and-bound backtracking
        def backtrack(
            train_idx: int,
            current_assignments: Dict[str, List[Train]],
            mapping: Dict[str, str],
            changes_count: int,
        ):
            # Prune if already worse than or equal to best known solution
            if changes_count >= min_reassignments[0]:
                return

            # Base case: all trains assigned successfully
            if train_idx == len(sorted_trains):
                min_reassignments[0] = changes_count
                best_solution[0] = dict(mapping)
                return

            t = sorted_trains[train_idx]
            orig_p = original_assignments.get(t.train_id)

            # Order candidate platforms: try original platform first if valid and active
            candidates: List[str] = []
            if orig_p and orig_p in self.active_platforms:
                candidates.append(orig_p)
                for p in self.active_platforms:
                    if p != orig_p:
                        candidates.append(p)
            else:
                candidates = list(self.active_platforms)

            for p in candidates:
                is_change = 0 if (orig_p and p == orig_p) else 1
                new_changes = changes_count + is_change

                if new_changes >= min_reassignments[0]:
                    continue

                if is_valid_assignment_for_train(
                    t,
                    p,
                    current_assignments[p],
                    closures_by_p[p],
                    self.min_gap,
                ):
                    # Choose platform p
                    current_assignments[p].append(t)
                    mapping[t.train_id] = p

                    backtrack(train_idx + 1, current_assignments, mapping, new_changes)

                    # Backtrack
                    current_assignments[p].pop()
                    del mapping[t.train_id]

                    # Optimization: If we found a 0-change solution, we cannot do better
                    if min_reassignments[0] == 0:
                        return

        initial_platform_trains = {p: [] for p in self.active_platforms}
        backtrack(0, initial_platform_trains, {}, 0)

        return best_solution[0]


def plan_schedule(
    timetable: Timetable,
    disruptions: List[Disruption],
) -> Tuple[str, str, Optional[Timetable], List[TimetableChange]]:
    """Applies disruptions and computes a replanned conflict-free schedule.

    Returns:
        (status, message, revised_timetable, changes)
        where status is 'success' or 'no_solution'.
    """
    # Create working copies
    revised = timetable.model_copy(deep=True)
    changes: List[TimetableChange] = []

    # Map of original train details for change logging
    orig_train_map: Dict[str, Train] = {t.train_id: t.model_copy() for t in timetable.trains}
    original_assignments: Dict[str, Optional[str]] = {t.train_id: t.assigned_platform for t in timetable.trains}

    train_lookup: Dict[str, Train] = {t.train_id: t for t in revised.trains}
    platform_ids: Set[str] = {p.platform_id for p in revised.platforms}

    # 1. Apply delays
    for d in disruptions:
        if d.type == "train_delay":
            if not d.train_id:
                return "no_solution", "Disruption missing required train_id.", None, []
            if d.train_id not in train_lookup:
                return "no_solution", f"Unknown train ID '{d.train_id}' in disruption request.", None, []

            delay = d.delay_minutes or 0
            if delay < 0:
                return "no_solution", f"Negative delay '{delay}' is invalid.", None, []

            t = train_lookup[d.train_id]
            old_arr = t.arrival_time
            old_dep = t.departure_time
            old_formatted = f"{t.formatted_arrival} - {t.formatted_departure}"

            t.arrival_time += delay
            t.departure_time += delay
            t.formatted_arrival = minutes_to_hhmm(t.arrival_time)
            t.formatted_departure = minutes_to_hhmm(t.departure_time)
            t.delay_minutes += delay
            t.status = "delayed"

            if delay > 0:
                changes.append(
                    TimetableChange(
                        train_id=t.train_id,
                        change_type="delay_applied",
                        field="time",
                        old_value=old_formatted,
                        new_value=f"{t.formatted_arrival} - {t.formatted_departure}",
                        reason=f"Delayed by {delay} min ({d.reason or 'disruption notice'})",
                    )
                )

        elif d.type == "platform_closure":
            if not d.platform_id:
                return "no_solution", "Disruption missing required platform_id.", None, []
            if d.platform_id not in platform_ids:
                return "no_solution", f"Unknown platform ID '{d.platform_id}' in closure request.", None, []
            if d.start_time is None or d.end_time is None:
                return "no_solution", "Platform closure requires start_time and end_time.", None, []
            if d.start_time >= d.end_time:
                return "no_solution", f"Closure start ({d.start_time}) must be earlier than end ({d.end_time}).", None, []

            new_closure = PlatformClosure(
                platform_id=d.platform_id,
                start_time=d.start_time,
                end_time=d.end_time,
                formatted_start=minutes_to_hhmm(d.start_time),
                formatted_end=minutes_to_hhmm(d.end_time),
                reason=d.reason or "Reported closure",
            )
            revised.platform_closures.append(new_closure)

    # 2. Run deterministic solver
    solver = ScheduleSolver(revised)
    solution_mapping = solver.solve(revised.trains, revised.platform_closures, original_assignments)

    if solution_mapping is None:
        return (
            "no_solution",
            "No feasible platform assignment found satisfying all minimum-gap and platform constraints.",
            None,
            [],
        )

    # 3. Apply solver platform assignments and log changes
    for t in revised.trains:
        new_platform = solution_mapping[t.train_id]
        orig_t = orig_train_map[t.train_id]
        orig_platform = orig_t.assigned_platform

        t.assigned_platform = new_platform
        if new_platform != orig_platform:
            if orig_platform is None:
                reason = f"Initial platform assignment to {new_platform}"
            else:
                reason = f"Reassigned from {orig_platform} to {new_platform} to resolve platform conflict"
                # Check if original platform was closed
                for c in revised.platform_closures:
                    if c.platform_id == orig_platform and overlaps_closure(
                        t.arrival_time, t.departure_time, c.start_time, c.end_time
                    ):
                        reason = f"Reassigned from {orig_platform} to {new_platform} because {orig_platform} is closed [{c.formatted_start}-{c.formatted_end}]"
                        break

            t.status = "reassigned" if t.status == "on_time" else t.status
            changes.append(
                TimetableChange(
                    train_id=t.train_id,
                    change_type="platform_reassigned",
                    field="platform",
                    old_value=orig_platform or "None",
                    new_value=new_platform,
                    reason=reason,
                )
            )

    # 4. Mandatory Independent Validation
    validation = validate_timetable(revised)
    if not validation.is_valid:
        return (
            "no_solution",
            f"Proposed schedule failed independent validation ({len(validation.errors)} errors found).",
            None,
            [],
        )

    return (
        "success",
        f"Timetable replanned successfully with {len(changes)} changes.",
        revised,
        changes,
    )


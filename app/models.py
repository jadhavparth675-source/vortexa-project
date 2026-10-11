from __future__ import annotations

from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, model_validator


def minutes_to_hhmm(minutes: int) -> str:
    """Converts minutes after midnight into 24-hour HH:MM format."""
    normalized = minutes % 1440
    hh = normalized // 60
    mm = normalized % 60
    return f"{hh:02d}:{mm:02d}"


def hhmm_to_minutes(time_str: str) -> int:
    """Converts 24-hour HH:MM string into minutes after midnight."""
    parts = time_str.strip().split(":")
    if len(parts) != 2:
        raise ValueError(f"Invalid time format '{time_str}', expected 'HH:MM'")
    hh = int(parts[0])
    mm = int(parts[1])
    if not (0 <= hh <= 23 and 0 <= mm <= 59):
        raise ValueError(f"Time values out of range in '{time_str}'")
    return hh * 60 + mm


class Platform(BaseModel):
    platform_id: str
    name: str
    is_active: bool = True
    description: Optional[str] = None


class Train(BaseModel):
    train_id: str
    name: str
    origin: Optional[str] = None
    destination: Optional[str] = None
    arrival_time: int = Field(description="Arrival time in minutes after midnight")
    departure_time: int = Field(description="Departure time in minutes after midnight")
    formatted_arrival: Optional[str] = None
    formatted_departure: Optional[str] = None
    assigned_platform: Optional[str] = None
    delay_minutes: int = 0
    status: str = "on_time"  # on_time, delayed, reassigned, cancelled

    @model_validator(mode="after")
    def populate_formatted_times(self) -> Train:
        if self.formatted_arrival is None and self.arrival_time is not None:
            self.formatted_arrival = minutes_to_hhmm(self.arrival_time)
        if self.formatted_departure is None and self.departure_time is not None:
            self.formatted_departure = minutes_to_hhmm(self.departure_time)
        return self


class PlatformClosure(BaseModel):
    closure_id: Optional[str] = None
    platform_id: str
    start_time: int = Field(description="Closure start time in minutes after midnight")
    end_time: int = Field(description="Closure end time in minutes after midnight")
    formatted_start: Optional[str] = None
    formatted_end: Optional[str] = None
    reason: Optional[str] = "Maintenance / Incident"

    @model_validator(mode="after")
    def populate_formatted_times(self) -> PlatformClosure:
        if self.formatted_start is None and self.start_time is not None:
            self.formatted_start = minutes_to_hhmm(self.start_time)
        if self.formatted_end is None and self.end_time is not None:
            self.formatted_end = minutes_to_hhmm(self.end_time)
        return self


class Timetable(BaseModel):
    station_id: str
    station_name: str
    minimum_gap_minutes: int = 5
    platforms: List[Platform]
    trains: List[Train]
    platform_closures: List[PlatformClosure] = []


class Disruption(BaseModel):
    type: str  # "train_delay" or "platform_closure"
    train_id: Optional[str] = None
    delay_minutes: Optional[int] = None
    platform_id: Optional[str] = None
    start_time: Optional[int] = None
    end_time: Optional[int] = None
    formatted_start: Optional[str] = None
    formatted_end: Optional[str] = None
    reason: Optional[str] = None

    @model_validator(mode="after")
    def format_closure_times(self) -> Disruption:
        if self.type == "platform_closure":
            if self.formatted_start is None and self.start_time is not None:
                self.formatted_start = minutes_to_hhmm(self.start_time)
            if self.formatted_end is None and self.end_time is not None:
                self.formatted_end = minutes_to_hhmm(self.end_time)
        return self


class ValidationErrorItem(BaseModel):
    code: str
    message: str
    platform_id: Optional[str] = None
    train_ids: List[str] = []
    conflict_time_start: Optional[int] = None
    conflict_time_end: Optional[int] = None


class ValidationSummary(BaseModel):
    total_trains: int
    total_platforms: int
    total_closures: int
    conflict_count: int


class ValidationResponse(BaseModel):
    is_valid: bool
    errors: List[ValidationErrorItem] = []
    warnings: List[str] = []
    summary: ValidationSummary


class ValidateRequest(BaseModel):
    timetable: Optional[Timetable] = None


class ParseDisruptionsRequest(BaseModel):
    text: str


class ParseDisruptionsResponse(BaseModel):
    raw_text: str
    disruptions: List[Disruption] = []
    warnings: List[str] = []
    needs_confirmation: bool = True


class TimetableChange(BaseModel):
    train_id: str
    change_type: str  # "delay_applied", "platform_reassigned", "timing_adjusted"
    field: str        # "time", "platform", "status"
    old_value: str
    new_value: str
    reason: str


class ApplyDisruptionsRequest(BaseModel):
    timetable: Optional[Timetable] = None
    disruptions: List[Disruption] = []
    disruptions_text: Optional[str] = None


class ApplyDisruptionsResponse(BaseModel):
    status: str  # "success" or "no_solution"
    message: str
    timetable: Optional[Timetable] = None
    changes: List[TimetableChange] = []
    validation: Optional[ValidationResponse] = None


class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "railflow-backend"
    version: str = "1.0.0"


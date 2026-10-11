"""RailFlow Backend API - FastAPI Application."""

import os
from typing import Optional, Dict, Any, Union
from fastapi import FastAPI, HTTPException, Body, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.models import (
    HealthResponse,
    Timetable,
    ValidateRequest,
    ValidationResponse,
    ParseDisruptionsRequest,
    ParseDisruptionsResponse,
    ApplyDisruptionsRequest,
    ApplyDisruptionsResponse,
)
from app.validator import validate_timetable
from app.parser import parse_disruptions_text
from app.solver import plan_schedule
from data import load_default_station_data

# Read CORS configuration from environment
cors_origins_env = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
)
allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
if "*" in allowed_origins:
    allowed_origins = ["*"]

app = FastAPI(
    title="RailFlow API",
    description="Railway Disruption & Platform Conflict Simulator Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Returns application health and service version."""
    return HealthResponse(
        status="healthy",
        service="railflow-backend",
        version="1.0.0",
    )


@app.get("/api/timetable", response_model=Timetable)
def get_timetable() -> Timetable:
    """Returns the default active fictional station timetable."""
    data = load_default_station_data()
    return Timetable(**data)


@app.post("/api/validate", response_model=ValidationResponse)
def validate_schedule(payload: Dict[str, Any] = Body(...)) -> ValidationResponse:
    """Independently validates a timetable payload.

    Accepts either { "timetable": { ... } } or direct Timetable object.
    """
    try:
        if "timetable" in payload and isinstance(payload["timetable"], dict):
            timetable_data = payload["timetable"]
        else:
            timetable_data = payload
        timetable = Timetable(**timetable_data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed timetable payload: {str(exc)}",
        )

    return validate_timetable(timetable)


@app.post("/api/disruptions/parse", response_model=ParseDisruptionsResponse)
def parse_disruptions(req: ParseDisruptionsRequest) -> ParseDisruptionsResponse:
    """Parses free-text disruption reports into structured disruption events."""
    if not req.text or not req.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Disruption text cannot be empty.",
        )
    return parse_disruptions_text(req.text)


@app.post("/api/disruptions/apply", response_model=ApplyDisruptionsResponse)
def apply_disruptions(req: ApplyDisruptionsRequest) -> ApplyDisruptionsResponse:
    """Applies disruptions, computes a replanned schedule, and validates it.

    Returns status: 'success' with revised timetable and changelog,
    or status: 'no_solution' if no conflict-free allocation is possible.
    """
    # 1. Resolve timetable: use provided or fallback to default station data
    if req.timetable is not None:
        current_timetable = req.timetable
    else:
        try:
            current_timetable = Timetable(**load_default_station_data())
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to load default station timetable: {str(exc)}",
            )

    # 2. Resolve disruptions: from structured list or parse from disruptions_text
    disruptions = list(req.disruptions)
    if not disruptions and req.disruptions_text:
        parsed_res = parse_disruptions_text(req.disruptions_text)
        disruptions.extend(parsed_res.disruptions)

    if not disruptions and not req.disruptions_text:
        # If no disruptions specified, solve/validate existing timetable
        disruptions = []

    # 3. Validate disruptions against known station identifiers
    train_ids = {t.train_id for t in current_timetable.trains}
    platform_ids = {p.platform_id for p in current_timetable.platforms}

    for d in disruptions:
        if d.type == "train_delay":
            if not d.train_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Train delay disruption must specify train_id.",
                )
            if d.train_id not in train_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unknown train identifier '{d.train_id}'.",
                )
            if d.delay_minutes is not None and d.delay_minutes < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Delay minutes cannot be negative (got {d.delay_minutes}).",
                )
        elif d.type == "platform_closure":
            if not d.platform_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Platform closure disruption must specify platform_id.",
                )
            if d.platform_id not in platform_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unknown platform identifier '{d.platform_id}'.",
                )
            if d.start_time is None or d.end_time is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Platform closure must specify start_time and end_time.",
                )
            if d.start_time >= d.end_time:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Platform closure start_time ({d.start_time}) must be earlier than end_time ({d.end_time}).",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported disruption type '{d.type}'.",
            )

    # 4. Execute Solver
    solver_status, message, revised_timetable, changes = plan_schedule(
        timetable=current_timetable,
        disruptions=disruptions,
    )

    if solver_status == "no_solution" or revised_timetable is None:
        return ApplyDisruptionsResponse(
            status="no_solution",
            message=message,
            timetable=None,
            changes=[],
            validation=None,
        )

    # 5. Independent validation
    validation_res = validate_timetable(revised_timetable)
    if not validation_res.is_valid:
        return ApplyDisruptionsResponse(
            status="no_solution",
            message=f"Solver candidate rejected by independent validator: {validation_res.errors[0].message if validation_res.errors else 'Validation failed'}",
            timetable=None,
            changes=[],
            validation=validation_res,
        )

    return ApplyDisruptionsResponse(
        status="success",
        message=message,
        timetable=revised_timetable,
        changes=changes,
        validation=validation_res,
    )


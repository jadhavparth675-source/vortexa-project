# RailFlow API Contract & Specification

**Service Name**: RailFlow Railway Disruption & Platform Conflict Simulator  
**Version**: 1.0.0  
**Base URL**: `/api`

---

## 1. Overview & Time Semantics

### Time Representation
- All times in internal scheduling logic and constraint calculations are represented as integer **minutes after midnight** (e.g. `00:00` = `0`, `01:30` = `90`, `10:00` = `600`, `10:20` = `620`, `23:59` = `1439`).
- User-facing responses provide both the integer minutes (`arrival_time`, `departure_time`) and human-readable strings in 24-hour `HH:MM` format (`formatted_arrival`, `formatted_departure`).

### Interval Semantics
- A train occupies a platform during the closed interval `[arrival_time, departure_time]`.
- Validity constraint: `arrival_time < departure_time` (minimum dwell time > 0).

### Minimum-Gap Semantics
- Station parameter: `minimum_gap_minutes` (default: 5 minutes).
- For any two distinct trains `A` and `B` assigned to the same platform:
  - If train `A` departs before or at train `B` arrives, then:
    $$\text{arrival}(B) \ge \text{departure}(A) + \text{minimum\_gap\_minutes}$$
  - If this condition is violated (i.e. $\text{arrival}(B) < \text{departure}(A) + \text{minimum\_gap\_minutes}$ while $\text{departure}(B) > \text{arrival}(A)$), it constitutes a platform conflict.

### Platform Closure Semantics
- A platform closure defines a disruption interval `[start_time, end_time]` during which no train may occupy the platform.
- A train `[arr, dep]` conflicts with a closure if:
  $$\max(\text{arr}, \text{start\_time}) < \min(\text{dep}, \text{end\_time})$$
- Additionally, the minimum buffer applies before and after train occupancies relative to adjacent scheduled events.

---

## 2. API Endpoints

### 2.1 Health Check
- **Endpoint**: `GET /api/health`
- **Description**: Returns system status.
- **Response `200 OK`**:
```json
{
  "status": "healthy",
  "service": "railflow-backend",
  "version": "1.0.0"
}
```

---

### 2.2 Timetable Retrieval
- **Endpoint**: `GET /api/timetable`
- **Description**: Returns current station configuration, platforms, active timetable, and platform closures.
- **Response `200 OK`**:
```json
{
  "station_id": "STN_CENTRAL",
  "station_name": "Central Grand Junction",
  "minimum_gap_minutes": 5,
  "platforms": [
    {
      "platform_id": "P1",
      "name": "Platform 1",
      "is_active": true
    },
    {
      "platform_id": "P2",
      "name": "Platform 2",
      "is_active": true
    },
    {
      "platform_id": "P3",
      "name": "Platform 3",
      "is_active": true
    },
    {
      "platform_id": "P4",
      "name": "Platform 4",
      "is_active": true
    }
  ],
  "trains": [
    {
      "train_id": "T101",
      "name": "Coastal Dawn Express",
      "origin": "Coastville",
      "destination": "Metro Central",
      "arrival_time": 600,
      "departure_time": 620,
      "formatted_arrival": "10:00",
      "formatted_departure": "10:20",
      "assigned_platform": "P1",
      "delay_minutes": 0,
      "status": "on_time"
    }
  ],
  "platform_closures": []
}
```

---

### 2.3 Timetable Validation
- **Endpoint**: `POST /api/validate`
- **Description**: Independently validates a timetable payload without relying on the scheduling solver.
- **Request Body**:
```json
{
  "timetable": {
    "station_id": "STN_CENTRAL",
    "station_name": "Central Grand Junction",
    "minimum_gap_minutes": 5,
    "platforms": [...],
    "trains": [...],
    "platform_closures": [...]
  }
}
```
*(Also accepts direct `Timetable` object at root).*

- **Response `200 OK` (Valid)**:
```json
{
  "is_valid": true,
  "errors": [],
  "warnings": [],
  "summary": {
    "total_trains": 8,
    "total_platforms": 4,
    "total_closures": 0,
    "conflict_count": 0
  }
}
```

- **Response `200 OK` (Invalid / Conflicts Found)**:
```json
{
  "is_valid": false,
  "errors": [
    {
      "code": "PLATFORM_OVERLAP",
      "message": "Trains T101 and T102 have overlapping occupancy on Platform P1",
      "platform_id": "P1",
      "train_ids": ["T101", "T102"],
      "conflict_time_start": 615,
      "conflict_time_end": 620
    },
    {
      "code": "MINIMUM_GAP_VIOLATION",
      "message": "Gap between Train T101 and Train T103 on Platform P1 is 2 min, less than required minimum 5 min",
      "platform_id": "P1",
      "train_ids": ["T101", "T103"],
      "conflict_time_start": 620,
      "conflict_time_end": 622
    },
    {
      "code": "CLOSED_PLATFORM_CONFLICT",
      "message": "Train T104 occupies Platform P2 during closure interval [600, 660]",
      "platform_id": "P2",
      "train_ids": ["T104"],
      "conflict_time_start": 610,
      "conflict_time_end": 630
    }
  ],
  "warnings": [],
  "summary": {
    "total_trains": 8,
    "total_platforms": 4,
    "total_closures": 1,
    "conflict_count": 3
  }
}
```

- **Response `400 Bad Request`**: For malformed JSON or structurally invalid payloads (e.g. negative times, missing required fields).

---

### 2.4 Free-Text Disruption Parsing
- **Endpoint**: `POST /api/disruptions/parse`
- **Description**: Parses natural language disruptions (e.g. `"Train T12 delayed 20 min. Platform P2 closed 10:00-11:00"`).
- **Request Body**:
```json
{
  "text": "Train T12 delayed 20 min. Platform P2 closed 10:00-11:00"
}
```
- **Response `200 OK`**:
```json
{
  "raw_text": "Train T12 delayed 20 min. Platform P2 closed 10:00-11:00",
  "disruptions": [
    {
      "type": "train_delay",
      "train_id": "T12",
      "delay_minutes": 20,
      "reason": "Delay parsed from request"
    },
    {
      "type": "platform_closure",
      "platform_id": "P2",
      "start_time": 600,
      "end_time": 660,
      "formatted_start": "10:00",
      "formatted_end": "11:00",
      "reason": "Platform closure parsed from request"
    }
  ],
  "warnings": [],
  "needs_confirmation": true
}
```
- **Response `400 Bad Request`**: If text is empty or blank.
- **Ambiguous input**: Returned with `disruptions: []` (or partial) and descriptive `warnings: ["..."]`, `needs_confirmation: true`.

---

### 2.5 Apply Disruptions & Replan Timetable
- **Endpoint**: `POST /api/disruptions/apply`
- **Description**: Applies parsed disruptions to the timetable, replans platform assignments and timings using the deterministic constraint solver, and verifies the solution with the independent validator.
- **Request Body**:
```json
{
  "timetable": { ... optional: if omitted, default station timetable is used ... },
  "disruptions": [
    {
      "type": "train_delay",
      "train_id": "T101",
      "delay_minutes": 15
    },
    {
      "type": "platform_closure",
      "platform_id": "P2",
      "start_time": 600,
      "end_time": 660
    }
  ]
}
```

- **Response `200 OK` (Solution Found)**:
```json
{
  "status": "success",
  "message": "Timetable replanned successfully with 2 changes.",
  "timetable": {
    "station_id": "STN_CENTRAL",
    "station_name": "Central Grand Junction",
    "minimum_gap_minutes": 5,
    "platforms": [...],
    "trains": [...],
    "platform_closures": [...]
  },
  "changes": [
    {
      "train_id": "T101",
      "change_type": "delay_applied",
      "field": "time",
      "old_value": "10:00 - 10:20",
      "new_value": "10:15 - 10:35",
      "reason": "Train delayed by 15 min"
    },
    {
      "train_id": "T102",
      "change_type": "platform_reassigned",
      "field": "platform",
      "old_value": "P2",
      "new_value": "P3",
      "reason": "Platform P2 closed between 10:00 and 11:00"
    }
  ],
  "validation": {
    "is_valid": true,
    "errors": [],
    "warnings": [],
    "summary": {
      "total_trains": 8,
      "total_platforms": 4,
      "total_closures": 1,
      "conflict_count": 0
    }
  }
}
```

- **Response `200 OK` (No Solution / Impossible Schedule)**:
```json
{
  "status": "no_solution",
  "message": "No feasible platform assignment found satisfying all minimum-gap and platform constraints.",
  "timetable": null,
  "changes": [],
  "validation": null
}
```

- **Response `400 Bad Request`**: Unknown train ID, unknown platform ID, or malformed disruption specifications.


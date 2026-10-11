# RailFlow Operations Dashboard — Frontend (VORTEXA 3.0)

Modern railway control-room dashboard built with **React**, **Vite**, and **vanilla CSS/SVG**.

Consumes the RailFlow FastAPI backend adhering strictly to [`docs/api-contract.md`](../docs/api-contract.md).

---

## Architecture

```text
frontend/
├── src/
│   ├── components/
│   │   ├── Header.jsx           # Control-room branding, UTC clock, health indicator, mock toggle
│   │   ├── MetricsBar.jsx       # Station metadata, platform/train counts, validation badge
│   │   ├── PlatformTimeline.jsx # SVG/CSS track lanes, occupancy intervals, closure hazard overlays
│   │   ├── TimetableTable.jsx   # Filterable tabular timetable schedule
│   │   ├── DisruptionPanel.jsx  # Natural language input, presets, confirmation preview
│   │   ├── ChangeLogPanel.jsx   # Visual audit diffs with solver explanation
│   │   ├── ValidationPanel.jsx  # Authoritative validation status (Valid / Conflict / No Solution)
│   │   └── AlertBanner.jsx      # System notices, warnings, and network error toasts
│   ├── services/
│   │   ├── api.js               # Centralized fetch API service (all 5 endpoints)
│   │   └── mockData.js          # Realistic mock data and local simulation fallbacks
│   ├── App.jsx                  # Main dashboard state machine and integration
│   ├── App.css                  # Control-room dark navy styling & animations
│   ├── index.css                # Base typography, resets & dark scrollbars
│   └── main.jsx                 # React root entry
├── index.html                   # HTML entry with Plus Jakarta Sans & JetBrains Mono fonts
├── vite.config.js               # Vite configuration (port 5173)
├── .env.example                 # Environment variables template
├── package.json
└── README.md
```

---

## Features

1. **Dashboard Header & Metrics**:
   - Station info, track bay count, active services count, and headway buffer.
   - Live UTC clock and backend connection status indicator.
   - Dynamic **Mock Mode Toggle** in the header so evaluators can test the UI offline or against the live FastAPI server.

2. **Platform Occupancy Timeline**:
   - Visual track lanes for all platforms (P1–P4).
   - Occupancy blocks positioned dynamically by time interval `[arrival_time, departure_time]`.
   - Closed platform hazard zones with striped warning patterns.
   - Distinct color themes: On-Time (Cyan), Delayed (Amber), Reassigned (Purple), Conflict (Red).
   - Clickable inspector drawer displaying full service details (origin, destination, dwell time, status).

3. **Disruption Input & Confirmation Preview**:
   - Free-text input with quick clickable presets (delay, closure, compound, impossible case).
   - Disruption parsing via `POST /api/disruptions/parse`.
   - **Confirmation Preview**: User inspects identified disruptions, delays, intervals, and warnings before applying.

4. **Deterministic Replanning & Change Log**:
   - Submits disruptions via `POST /api/disruptions/apply`.
   - Renders revised timetable, updated timeline, and audit change log displaying old $\rightarrow$ new values and solver reasons.

5. **Validation Panel**:
   - Displays authoritative backend validation results from `POST /api/validate`.
   - Clearly differentiates:
     - **Valid Timetable** (green confirmation)
     - **Integrity Conflicts** (red error cards with affected trains, platform, and time window)
     - **No Solution Result** (amber/red banner when constraints cannot be satisfied)

---

## Setup & Running

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env`:
```ini
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCK=false
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
```
Build output is generated in `frontend/dist/`.


RailFlow: Railway Disruption & Platform Conflict Simulator
Built for VORTEXA 3.0 (problem statement P-03), a 12-hour student hackathon.
RailFlow assigns trains to platforms at a small fictional station, then replans the timetable when a delay or platform closure happens. Every change comes with a reason, and every revised timetable is checked by an independent validator before it is shown as valid.
Features
Platform assignment: no platform is ever double-occupied, and the minimum gap between trains is always respected.
Disruptions: train delays of a stated length and platform closures for a stated period.
Replanning with reasons: only affected trains are moved, and each change is logged with why it happened.
Independent validator: separate code that re-checks every timetable for overlaps and gap violations. A timetable that fails is never presented as valid.
Free-text disruptions: type something like Train 12 delayed 20 min, platform 2 closed 10:00-11:00 and it is converted into structured delays and closures. The user confirms before anything is applied.
Clear failure: if no valid timetable exists (for example, all platforms closed), the app says so instead of producing a broken one.
How AI is used
AI only reads text and explains trade-offs. It never decides platform assignments. Those follow from the constraints in the solver.
A rule-based parser works as the local fallback, so the core demo runs with no external API or internet connection.
Tech Stack
Layer
Technology
Backend / API
Python, FastAPI
Solver
Python (greedy assignment with backtracking)
Validator
Separate Python module, shares no code with the solver
Text parsing (local fallback)
Regex + dateparser
Text parsing (optional)
LLM with JSON output (local model via Ollama or a free-tier API)
Frontend
React + Vite, timeline drawn with SVG/CSS
Storage
JSON files / SQLite
Testing
pytest
Project Structure
railflow/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI routes
│   │   ├── solver.py        # platform assignment + replanning
│   │   ├── validator.py     # independent timetable checker
│   │   └── parser.py        # free-text disruption parser
│   ├── data/                # sample station + timetable (fictional)
│   ├── tests/
│   └── requirements.txt
├── frontend/                # React + Vite app
└── README.md
Getting Started
Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
Frontend
cd frontend
npm install
npm run dev
Tests
cd backend
pytest
Demo Flow
Load the sample timetable and show the valid platform timeline.
Enter a disruption in plain text and confirm the parsed delays/closures.
Watch the timeline revise, with a reason for each change.
Show the validator passing on the revised timetable.
Trigger an impossible case (close every platform) to show the clear failure message.
Limitations
The solver uses a heuristic and is not guaranteed to find the best possible timetable.
Only a single small fictional station is modelled.
No live railway data is used.
Team
Tanvi Walunj 
Parth Jadhv 
Kartik Shirsath
Asmita Aher

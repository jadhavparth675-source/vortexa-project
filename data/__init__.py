import json
from pathlib import Path
from typing import Dict, Any

DATA_DIR = Path(__file__).parent
STATION_DATA_PATH = DATA_DIR / "station_data.json"


def load_default_station_data() -> Dict[str, Any]:
    """Loads the fictional station and timetable data from JSON."""
    with open(STATION_DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


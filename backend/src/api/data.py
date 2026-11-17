import json
import os
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(os.getenv("DATA_DIR", Path(__file__).resolve().parents[2] / "data"))

@lru_cache
def snapshot() -> dict:
    return json.loads((DATA_DIR / "snapshot.json").read_text())
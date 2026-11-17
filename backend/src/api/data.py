import json
import os
from functools import lru_cache
from pathlib import Path

import pandas as pd

DATA_DIR = Path(os.getenv("DATA_DIR", Path(__file__).resolve().parents[2] / "data"))

@lru_cache
def snapshot() -> dict:
    return json.loads((DATA_DIR / "snapshot.json").read_text())

@lru_cache
def fields() -> pd.DataFrame:
    return pd.read_parquet(DATA_DIR / "fields.parquet").set_index("field_id", drop=False)

@lru_cache
def production() -> pd.DataFrame:
    return pd.read_parquet(DATA_DIR / "production_monthly.parquet")

@lru_cache
def producing_years() -> pd.DataFrame:
    p = production()
    p = p[p.oe_net_msm3 > 0]
    return {int(fid): sorted(int(y) for y in years.unique()) for fid, years in p.groupby("field_id").year}

def outlines_path() -> Path:
    """GeoJSON file with every field outline. Sent as a file, so it is never loaded into memory."""
    return DATA_DIR / "field_outlines.geojson"

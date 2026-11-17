import json
import os
from functools import lru_cache
from pathlib import Path

import pandas as pd

# backend/src/api/data.py -> backend/data
DATA_DIR = Path(os.getenv("DATA_DIR", Path(__file__).resolve().parents[2] / "data"))
SM3_TO_BBL = 6.2898  # barrels in one standard cubic metre of oil


@lru_cache
def snapshot() -> dict:
    return json.loads((DATA_DIR / "snapshot.json").read_text())


@lru_cache
def fields() -> pd.DataFrame:
    return pd.read_parquet(DATA_DIR / "fields.parquet").set_index("field_id", drop=False)


@lru_cache
def production() -> pd.DataFrame:
    p = pd.read_parquet(DATA_DIR / "production_monthly.parquet")
    days = p.date.dt.days_in_month
    p["oil_rate"] = (p.oil_gross_msm3 * 1e6 / days).clip(lower=0)  # Sm3 per day
    p["gas_rate"] = (p.gas_gross_bsm3 * 1e9 / days).clip(lower=0)  # Sm3 per day
    return p


def field_monthly(field_id: int) -> pd.DataFrame:
    p = production()
    return p[p.field_id == field_id].sort_values("date")


@lru_cache
def producing_years() -> dict[int, list[int]]:
    p = production()
    p = p[p.oe_net_msm3 > 0]
    return {int(fid): sorted(int(y) for y in years.unique()) for fid, years in p.groupby("field_id").year}


def outlines_path() -> Path:
    return DATA_DIR / "field_outlines.geojson"
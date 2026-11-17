import pandas as pd
from fastapi import APIRouter
from fastapi.responses import FileResponse

from . import data
from .schemas import FieldSummary

router = APIRouter(prefix="/api")
CACHE_A_DAY = {"Cache-Control": "public, max-age=86400"}

def _none(value):
    return None if pd.isna(value) else value

def _summary(row: pd.Series) -> dict:
    field_id = int(row.field_id)
    return dict(
        field_id=field_id,
        name=row["name"],  # row.name would give the row's index, not the name column
        status=row.status,
        main_product=row.main_product,
        operator=_none(row.operator),
        lon=_none(row.lon),
        lat=_none(row.lat),
        first_production_year=_none(row.first_production_year),
        last_production_year=_none(row.last_production_year),
        cum_oe_net_msm3=float(row.cum_oe_net_msm3),
        producing_years=data.producing_years().get(field_id, []),
    )

@router.get("/snapshot", summary="Data snapshot")
def snapshot() -> dict:
    return data.snapshot()

@router.get("/fields", response_model=list[FieldSummary], summary="Every field, largest first")
def list_fields() -> list[dict]:
    return [_summary(row) for _, row in data.fields().iterrows()]

@router.get("/fields/outlines", summary="Field outlines as GeoJSON, for the map")
def field_outlines() -> FileResponse:
    return FileResponse(data.outlines_path(), media_type="application/geo+json", headers=CACHE_A_DAY)
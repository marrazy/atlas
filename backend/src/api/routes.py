import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from . import data
from .schemas import FieldSummary, FieldDetail

router = APIRouter(prefix="/api")
CACHE_A_DAY = {"Cache-Control": "public, max-age=86400"}

def _none(value):
    return None if pd.isna(value) else value

def _field_or_404(field_id: int) -> pd.Series:
    """Look up one field, or answer 404 if there is no field with that id."""
    f = data.fields()
    if field_id not in f.index:
        raise HTTPException(status_code=404, detail=f"no field with id {field_id}")
    return f.loc[field_id]

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

@router.get("/fields/{field_id}", response_model=FieldDetail, summary="One field with its headline numbers")
def field_detail(field_id: int) -> dict:
    row = _field_or_404(field_id)
    months = data.field_monthly(field_id)
    has_oil = len(months) > 0 and months.oil_rate.max() > 0
    peak = months.loc[months.oil_rate.idxmax()] if has_oil else None
    return _summary(row) | dict(
        hc_type=row.hc_type,
        main_area=row.main_area,
        operator_full=_none(row.operator_full),
        discovery_year=_none(row.discovery_year),
        cum_liquids_net_msm3=float(row.cum_liquids_net_msm3),
        cum_gas_net_bsm3=float(row.cum_gas_net_bsm3),
        total_oil_gross_mmbbl=round(float(months.oil_gross_msm3.sum()) * data.SM3_TO_BBL, 3),
        peak_oil_rate=round(float(peak.oil_rate), 1) if peak is not None else None,
        peak_oil_month=peak.date.strftime("%Y-%m") if peak is not None else None,
        factpage_url=row.factpage_url,
    )
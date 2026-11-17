import statistics

import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse


from . import data
from .decline import band, fit, remaining_to_limit
from .schemas import FieldSummary, FieldDetail, ProductionMonth, InvestmentYear, ShelfSummary, ShelfYear, LifecycleSet, DeclineRequest, DeclineResult

router = APIRouter(prefix="/api")

MIN_OIL_FOR_GOR = 50 # Sm3 per day. Below this the gas oil ratio is mostly noise.
MIN_LIFECYCLE_YEARS = 4  # a field needs a few years of output before its life has a shape
NEAR_PEAK = 0.9  # a year counts as "on plateau" if it is within 10% of the best year
MIN_FIELDS_FOR_MEDIAN = 8  # fewer fields than this at an age, and the median is too shaky to show
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

@router.get("/fields/{field_id}/production", response_model=list[ProductionMonth],
            summary="Monthly rates for one field")
def field_production(field_id: int) -> list[dict]:
    _field_or_404(field_id)
    months = data.field_monthly(field_id)

    # drop the empty months before first production and after last production
    producing = months.index[months.oe_gross_msm3 > 0]
    if len(producing) == 0:
        return []
    months = months.loc[producing[0]:producing[-1]]

    # gas oil ratio only where both oil and gas were reported
    # (Volve, for example, reported no gas in its first months)
    has_both = (months.oil_rate > MIN_OIL_FOR_GOR) & (months.gas_rate > 0)
    gor = np.where(has_both, months.gas_rate / months.oil_rate.where(has_both), np.nan)

    return [
        dict(
            month=d.strftime("%Y-%m"),
            oil_rate=round(float(oil), 1),
            gas_rate=round(float(gas), 0),
            gor=None if np.isnan(r) else round(float(r), 1),
            oe_net_msm3=round(float(oe), 6),
        )
        for d, oil, gas, r, oe in zip(months.date, months.oil_rate, months.gas_rate, gor, months.oe_net_msm3)
    ]

@router.get("/fields/{field_id}/investments", response_model=list[InvestmentYear],
            summary="Investment by year for one field")
def field_investments(field_id: int) -> list[dict]:
    _field_or_404(field_id)
    inv = data.investments()
    inv = inv[inv.field_id == field_id].sort_values("year")
    return [dict(year=int(y), investment_mnok=round(float(v), 1)) for y, v in zip(inv.year, inv.investment_mnok)]

@router.get("/shelf", response_model=ShelfSummary, summary="Yearly production for the whole shelf")
def shelf() -> dict:
    columns = ["liquids_net_msm3", "gas_net_bsm3", "oe_net_msm3"]
    years = data.yearly_by_field().groupby("year", as_index=False)[columns].sum()
    peak = years.loc[years.oe_net_msm3.idxmax()]
    return dict(
        years=[
            dict(year=int(r.year), liquids_net_msm3=round(r.liquids_net_msm3, 3),
                 gas_net_bsm3=round(r.gas_net_bsm3, 3), oe_net_msm3=round(r.oe_net_msm3, 3))
            for r in years.itertuples()
        ],
        peak_year=int(peak.year),
        peak_oe_net_msm3=round(float(peak.oe_net_msm3), 3),
        total_oe_net_msm3=round(float(data.production().oe_net_msm3.sum()), 1),
        producing_fields_now=int((data.fields().status == "Producing").sum()),
    )

@router.get("/lifecycles", response_model=LifecycleSet, summary="Every field's life as a share of its best year")
def lifecycles(
    min_cum: float = Query(8, ge=0, description="Only fields that produced at least this much, million Sm3 o.e."),
    include: list[int] = Query([], description="Field ids to show even if they produced less than min_cum"),
) -> dict:
    for field_id in include:
        _field_or_404(field_id)

    fields = data.fields()
    yearly = data.yearly_by_field()
    yearly = yearly[yearly.oe_net_msm3 > 0]

    out = []
    for field_id, years in yearly.groupby("field_id"):
        row = fields.loc[field_id]
        big_enough = row.cum_oe_net_msm3 >= min_cum or field_id in include
        if len(years) < MIN_LIFECYCLE_YEARS or not big_enough:
            continue
        years = years.sort_values("year")
        best = float(years.oe_net_msm3.max())
        first_year = int(years.year.iloc[0])
        out.append(dict(
            field_id=int(field_id),
            name=row["name"],
            main_product=row.main_product,
            first_year=first_year,
            peak_year=int(years.loc[years.oe_net_msm3.idxmax(), "year"]),
            plateau_years=int((years.oe_net_msm3 >= NEAR_PEAK * best).sum()),
            series=[(int(y) - first_year, round(float(v) / best, 4)) for y, v in zip(years.year, years.oe_net_msm3)],
        ))

    # median shape: at each age, the middle value across all fields that reached that age
    by_age: dict[int, list[float]] = {}
    for life in out:
        for age, share in life["series"]:
            by_age.setdefault(age, []).append(share)
    median = [(age, round(statistics.median(shares), 4))
              for age, shares in sorted(by_age.items()) if len(shares) >= MIN_FIELDS_FOR_MEDIAN]

    return dict(fields=sorted(out, key=lambda life: (life["first_year"], life["name"])), median=median)

@router.post("/decline-fit", response_model=DeclineResult, summary="Fit an Arps decline curve to one field's oil rate")
def decline_fit(req: DeclineRequest) -> dict:
    _field_or_404(req.field_id)
    months = data.field_monthly(req.field_id)
    start = pd.Timestamp(f"{req.start}-01")
    end = pd.Timestamp(f"{req.end}-01")
    window = months[(months.date >= start) & (months.date <= end)]
    if window.empty:
        raise HTTPException(status_code=422, detail="no production data in that window")

    # time in whole months from the start of the window
    t = ((window.date.dt.year - start.year) * 12 + (window.date.dt.month - start.month)).to_numpy()
    try:
        f = fit(t, window.oil_rate.to_numpy(), req.model)
    except ValueError as e:  # too few months with production
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError:  # SciPy could not find a fit
        raise HTTPException(status_code=422, detail="the curve could not be fitted to this window, try another one")

    t_end = float(t.max())
    ahead = np.arange(1, req.forecast_months + 1)
    t_forecast = t_end + ahead
    low, high = band(f, t_forecast, t_end)
    last_month = window.date.max()
    forecast_dates = [last_month + pd.DateOffset(months=int(k)) for k in ahead]
    remaining, to_limit = remaining_to_limit(f, t_end, req.economic_limit)

    def ym(d) -> str:
        return d.strftime("%Y-%m")

    return dict(
        model=f.model,
        qi=round(f.qi, 1),
        di_annual_pct=round(f.di_annual_pct, 1),
        b=round(f.b, 3),
        b_at_limit=f.b_at_limit,
        r2=round(f.r2, 3),
        months_used=f.n,
        actual=[dict(month=ym(d), rate=round(float(q), 1)) for d, q in zip(window.date, window.oil_rate)],
        fitted=[dict(month=ym(d), rate=round(float(q), 1)) for d, q in zip(window.date, f.rate(t))],
        forecast=[dict(month=ym(d), rate=round(float(q), 1), low=round(float(lo), 1), high=round(float(hi), 1))
                  for d, q, lo, hi in zip(forecast_dates, f.rate(t_forecast), low, high)],
        remaining_mmbbl=round(remaining, 2),
        months_to_limit=to_limit,
    )
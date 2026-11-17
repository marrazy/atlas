from typing import Annotated

from pydantic import BaseModel, Field, model_validator

from .decline import Model

YearMonth = Annotated[str, Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$", examples=["2015-04"])]


class FieldSummary(BaseModel):
    field_id: int = Field(description="Sodir's id for the field")
    name: str
    status: str = Field(description="For example 'Producing', 'Shut down' or 'Approved for production'")
    main_product: str = Field(description="'oil' or 'gas', whichever made up more of total output")
    operator: str | None
    lon: float | None = Field(description="Centre of the field outline. Empty if Sodir has no outline.")
    lat: float | None
    first_production_year: int | None = Field(description="Empty if the field has not produced yet")
    last_production_year: int | None = Field(description="Only set for fields that have shut down")
    cum_oe_net_msm3: float = Field(description="Total saleable production, million Sm3 oil equivalent")
    producing_years: list[int] = Field(description="Years with any production, for the map's year slider")

class FieldDetail(FieldSummary):
    hc_type: str = Field(description="Sodir's hydrocarbon type, for example 'OIL' or 'GAS/CONDENSATE'")
    main_area: str = Field(description="'North sea', 'Norwegian sea' or 'Barents sea'")
    operator_full: str | None = Field(description="Operator's full company name")
    discovery_year: int | None
    cum_liquids_net_msm3: float = Field(description="Total saleable oil, NGL and condensate, million Sm3")
    cum_gas_net_bsm3: float = Field(description="Total saleable gas, billion Sm3")
    total_oil_gross_mmbbl: float = Field(description="Total gross oil, million barrels")
    peak_oil_rate: float | None = Field(description="Highest monthly gross oil rate, Sm3 per day. Empty if no oil.")
    peak_oil_month: str | None = Field(description="Month of the peak, as YYYY-MM")
    factpage_url: str = Field(description="The field's page on Sodir FactPages")

class ProductionMonth(BaseModel):
    month: str = Field(description="YYYY-MM")
    oil_rate: float = Field(description="Gross oil, Sm3 per day")
    gas_rate: float = Field(description="Gross gas, Sm3 per day")
    gor: float | None = Field(description="Gas oil ratio, Sm3 of gas per Sm3 of oil. "
                                          "Empty when there is too little oil, or no gas was reported.")
    oe_net_msm3: float = Field(description="Saleable oil equivalent that month, million Sm3")

class InvestmentYear(BaseModel):
    year: int
    investment_mnok: float = Field(description="Million Norwegian kroner, not adjusted for inflation")

class ShelfYear(BaseModel):
    year: int
    liquids_net_msm3: float = Field(description="Saleable oil, NGL and condensate, million Sm3")
    gas_net_bsm3: float = Field(description="Saleable gas, billion Sm3")
    oe_net_msm3: float = Field(description="Total in oil equivalent, million Sm3. Equals liquids plus gas.")


class ShelfSummary(BaseModel):
    years: list[ShelfYear] = Field(description="Full years only, from 1971")
    peak_year: int
    peak_oe_net_msm3: float
    total_oe_net_msm3: float = Field(description="Everything produced up to the last month in the snapshot, "
                                                 "million Sm3 oil equivalent")
    producing_fields_now: int = Field(description="Fields whose current status is 'Producing'")

class Lifecycle(BaseModel):
    field_id: int
    name: str
    main_product: str
    first_year: int = Field(description="First full year with production")
    peak_year: int = Field(description="Year with the most production")
    plateau_years: int = Field(description="Years within 10% of the best year")
    series: list[tuple[int, float]] = Field(description="Pairs of [years since first production, share of best year from 0 to 1]")


class LifecycleSet(BaseModel):
    fields: list[Lifecycle] = Field(description="Oldest field first")
    median: list[tuple[int, float]] = Field(description="Median share of best year at each age, "
                                                        "only where at least 8 fields have data")

class DeclineRequest(BaseModel):
    field_id: int = Field(examples=[3420717], description="3420717 is Volve")
    start: YearMonth = Field(description="First month of the fit window", examples=["2015-04"])
    end: YearMonth = Field(description="Last month of the fit window", examples=["2016-08"])
    model: Model = Model.hyperbolic
    forecast_months: int = Field(40, ge=1, le=240, description="How many months past the window to forecast")
    economic_limit: float = Field(300, gt=0, description="Rate below which the field stops paying, Sm3 per day")

    @model_validator(mode="after")
    def window_in_order(self):
        if self.end <= self.start:
            raise ValueError("end must be after start")
        return self


class RatePoint(BaseModel):
    month: str
    rate: float = Field(description="Sm3 per day")


class ForecastPoint(RatePoint):
    low: float = Field(description="Bottom of the rough 95% range, Sm3 per day")
    high: float = Field(description="Top of the rough 95% range, Sm3 per day")


class DeclineResult(BaseModel):
    model: Model
    qi: float = Field(description="Fitted rate at the start of the window, Sm3 per day")
    di_annual_pct: float = Field(description="Nominal yearly decline at the start of the window, percent")
    b: float
    b_at_limit: bool = Field(description="True when a hyperbolic fit pushed b to the edge of its range, "
                                         "so the decline is really exponential (low edge) or harmonic (high edge)")
    r2: float = Field(description="Fit quality on log(rate). 1 is perfect.")
    months_used: int = Field(description="Months in the window with production, used for the fit")
    actual: list[RatePoint] = Field(description="Every month in the window, as reported")
    fitted: list[RatePoint] = Field(description="The fitted curve over the window")
    forecast: list[ForecastPoint] = Field(description="The curve continued past the window, with its range")
    remaining_mmbbl: float = Field(description="Oil after the window until the economic limit, million barrels")
    months_to_limit: int | None = Field(description="Months after the window until the economic limit. "
                                                    "Empty if not reached within 50 years.")

from pydantic import BaseModel, Field


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
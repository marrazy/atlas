
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


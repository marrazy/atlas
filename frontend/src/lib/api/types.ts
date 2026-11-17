// The shapes the backend returns. They follow backend/src/api/schemas.py.
// Units: volumes in million Sm³ (oil, o.e.) or billion Sm³ (gas), rates in Sm³ per day.

export type MainProduct = 'oil' | 'gas'

/** "YYYY-MM", for example "2015-04". */
export type YearMonth = string

export type Snapshot = {
  source: string
  licence: string
  downloaded_at: string
  last_month: YearMonth
  last_full_year: number
  fields: number
  fields_without_outline: string[]
  production_rows: number
  rows_with_negative_adjustments: number
  attribution: string
}

export type FieldSummary = {
  field_id: number
  name: string
  /** For example "Producing", "Shut down" or "Approved for production". */
  status: string
  main_product: MainProduct
  operator: string | null
  /** Empty when Sodir has no outline for the field (Sindre). */
  lon: number | null
  lat: number | null
  /** Empty when the field has not produced yet. */
  first_production_year: number | null
  /** Only set for fields that have shut down. */
  last_production_year: number | null
  cum_oe_net_msm3: number
  producing_years: number[]
}

export type FieldDetail = FieldSummary & {
  hc_type: string
  main_area: string
  operator_full: string | null
  discovery_year: number | null
  cum_liquids_net_msm3: number
  cum_gas_net_bsm3: number
  total_oil_gross_mmbbl: number
  /** Sm³ per day. Empty when the field has no oil. */
  peak_oil_rate: number | null
  peak_oil_month: YearMonth | null
  factpage_url: string
}

export type ProductionMonth = {
  month: YearMonth
  oil_rate: number
  gas_rate: number
  /** Sm³ gas per Sm³ oil. Empty when there is too little oil or no gas was reported. */
  gor: number | null
  oe_net_msm3: number
}

export type InvestmentYear = {
  year: number
  /** Million NOK, not adjusted for inflation. */
  investment_mnok: number
}

export type ShelfYear = {
  year: number
  liquids_net_msm3: number
  gas_net_bsm3: number
  oe_net_msm3: number
}

export type ShelfSummary = {
  /** Full years only, 1971 to the last full year. */
  years: ShelfYear[]
  peak_year: number
  peak_oe_net_msm3: number
  /** Includes the unfinished current year, so it covers more than `years`. */
  total_oe_net_msm3: number
  producing_fields_now: number
}

/** [years since first production, share of the best year from 0 to 1] */
export type LifecyclePoint = [age: number, share: number]

export type Lifecycle = {
  field_id: number
  name: string
  main_product: MainProduct
  first_year: number
  peak_year: number
  plateau_years: number
  /** Ages can jump when a field paused production (Heimdal). */
  series: LifecyclePoint[]
}

export type LifecycleSet = {
  fields: Lifecycle[]
  median: LifecyclePoint[]
}

export type DeclineModel = 'exponential' | 'hyperbolic' | 'harmonic'

export type DeclineRequest = {
  field_id: number
  start: YearMonth
  end: YearMonth
  model?: DeclineModel
  /** 1 to 240. The API uses 40 when left out. */
  forecast_months?: number
  /** Sm³ per day. The API uses 300 when left out. */
  economic_limit?: number
}

export type RatePoint = {
  month: YearMonth
  rate: number
}

export type ForecastPoint = RatePoint & {
  low: number
  high: number
}

export type DeclineResult = {
  model: DeclineModel
  qi: number
  di_annual_pct: number
  b: number
  /** True when a hyperbolic fit pushed b to the edge of its range. */
  b_at_limit: boolean
  r2: number
  months_used: number
  actual: RatePoint[]
  fitted: RatePoint[]
  forecast: ForecastPoint[]
  remaining_mmbbl: number
  /** Empty when the limit is not reached within 50 years. */
  months_to_limit: number | null
}

export type FieldOutline = {
  type: 'Feature'
  properties: Pick<FieldSummary, 'field_id' | 'name' | 'main_product' | 'status'>
  geometry: {
    type: 'MultiPolygon'
    /** [longitude, latitude] pairs in WGS84 degrees. */
    coordinates: [number, number][][][]
  }
}

export type FieldOutlines = {
  type: 'FeatureCollection'
  features: FieldOutline[]
}

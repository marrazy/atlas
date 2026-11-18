/**
 * Rules that live in the backend, repeated here so the Methods page can explain them.
 * backend-rules.test.ts reads the backend files and fails if a value here is different.
 */
export const BACKEND_RULES = {
  /** MIN_LIFECYCLE_YEARS in routes.py: a field needs this many years of production for the lifecycles. */
  minLifecycleYears: 4,
  /** NEAR_PEAK in routes.py: a year is near peak at this share of the best year or more. */
  nearPeakShare: 0.9,
  /** MIN_FIELDS_FOR_MEDIAN in routes.py: the median line is only drawn where this many fields reached that age. */
  minFieldsForMedian: 8,
  /** MIN_OIL_FOR_GOR in routes.py, Sm³ per day: below this the gas oil ratio is left empty. */
  minOilForGor: 50,
  /** In decline.py: a decline curve needs this many months with production. */
  minFitMonths: 6,
  /** B_MIN and B_MAX in decline.py: the range a hyperbolic fit may choose b from. */
  bMin: 0.01,
  bMax: 1.0,
  /** MAX_FORECAST_MONTHS in decline.py: how far ahead the remaining oil is counted. */
  maxForecastMonths: 600,
} as const

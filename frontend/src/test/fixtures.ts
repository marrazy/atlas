// Real API responses, copied from the backend on 2026-11-17 and shortened.
// `satisfies` makes the type check fail if the API types stop matching this data.
import type {
  DeclineResult,
  FieldDetail,
  FieldOutlines,
  FieldSummary,
  InvestmentYear,
  LifecycleSet,
  ProductionMonth,
  ShelfSummary,
  Snapshot,
} from '@/lib/api/types'

export const VOLVE_ID = 3420717

export const snapshot = {
  source: 'https://factmaps.sodir.no/api/rest/services/DataService/Data/FeatureServer',
  licence: 'NLOD 2.0',
  downloaded_at: '2026-11-15T13:13:43+00:00',
  last_month: '2026-08',
  last_full_year: 2025,
  fields: 142,
  fields_without_outline: ['Sindre'],
  production_rows: 28442,
  rows_with_negative_adjustments: 189,
  attribution:
    'Data from the Norwegian Offshore Directorate (Sodir), Norwegian Licence for Open Government Data (NLOD).',
} satisfies Snapshot

export const fields = [
  {
    field_id: 3420717,
    name: 'Volve',
    status: 'Shut down',
    main_product: 'oil',
    operator: 'Equinor',
    lon: 1.886,
    lat: 58.4385,
    first_production_year: 2008,
    last_production_year: 2016,
    cum_oe_net_msm3: 11.377,
    producing_years: [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016],
  },
  {
    field_id: 29401178,
    name: 'Sindre',
    status: 'Producing',
    main_product: 'gas',
    operator: 'Equinor',
    lon: null,
    lat: null,
    first_production_year: 2017,
    last_production_year: null,
    cum_oe_net_msm3: 0.253,
    producing_years: [2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026],
  },
  {
    field_id: 42002473,
    name: 'Berling',
    status: 'Approved for production',
    main_product: 'gas',
    operator: 'OMV (Norge)',
    lon: 6.3668,
    lat: 65.1792,
    first_production_year: null,
    last_production_year: null,
    cum_oe_net_msm3: 0,
    producing_years: [],
  },
] satisfies FieldSummary[]

export const volve = {
  ...fields[0],
  hc_type: 'OIL',
  main_area: 'North sea',
  operator_full: 'Equinor Energy AS',
  discovery_year: 1993,
  cum_liquids_net_msm3: 10.565,
  cum_gas_net_bsm3: 0.813,
  total_oil_gross_mmbbl: 63.335,
  peak_oil_rate: 8923.8,
  peak_oil_month: '2008-12',
  factpage_url: 'https://factpages.sodir.no/field/pageview/all/3420717',
} satisfies FieldDetail

export const volveProduction = [
  { month: '2008-02', oil_rate: 1694.7, gas_rate: 0, gor: null, oe_net_msm3: 0.049091 },
  { month: '2008-03', oil_rate: 2689.1, gas_rate: 0, gor: null, oe_net_msm3: 0.087871 },
  { month: '2008-04', oil_rate: 2497.5, gas_rate: 0, gor: null, oe_net_msm3: 0.08741 },
  { month: '2008-05', oil_rate: 4047.7, gas_rate: 615968, gor: 152.2, oe_net_msm3: 0.148223 },
] satisfies ProductionMonth[]

export const volveInvestments = [
  { year: 2005, investment_mnok: 184 },
  { year: 2006, investment_mnok: 583 },
  { year: 2007, investment_mnok: 1170 },
] satisfies InvestmentYear[]

export const shelf = {
  years: [
    { year: 1971, liquids_net_msm3: 0.357, gas_net_bsm3: 0, oe_net_msm3: 0.357 },
    { year: 1972, liquids_net_msm3: 1.927, gas_net_bsm3: 0, oe_net_msm3: 1.927 },
    { year: 2004, liquids_net_msm3: 185.095, gas_net_bsm3: 79.311, oe_net_msm3: 264.406 },
  ],
  peak_year: 2004,
  peak_oe_net_msm3: 264.406,
  total_oe_net_msm3: 9105,
  producing_fields_now: 102,
} satisfies ShelfSummary

export const lifecycles = {
  fields: [
    {
      field_id: 3420717,
      name: 'Volve',
      main_product: 'oil',
      first_year: 2008,
      peak_year: 2009,
      plateau_years: 1,
      series: [
        [0, 0.6378],
        [1, 1.0],
        [2, 0.6093],
        [3, 0.3056],
        [4, 0.2041],
        [5, 0.1956],
        [6, 0.2467],
        [7, 0.2827],
        [8, 0.1129],
      ],
    },
  ],
  median: [
    [0, 0.1541],
    [1, 0.7764],
    [2, 0.8782],
    [3, 0.798],
  ],
} satisfies LifecycleSet

export const volveDeclineHyperbolic = {
  model: 'hyperbolic',
  qi: 3042.5,
  di_annual_pct: 88.4,
  b: 0.01,
  b_at_limit: true,
  r2: 0.931,
  months_used: 17,
  actual: [
    { month: '2015-04', rate: 3007.5 },
    { month: '2015-05', rate: 2808.5 },
  ],
  fitted: [
    { month: '2015-04', rate: 3042.5 },
    { month: '2015-05', rate: 2826.4 },
  ],
  forecast: [
    { month: '2016-09', rate: 876.3, low: 704.9, high: 1089.3 },
    { month: '2016-10', rate: 814.8, low: 651.6, high: 1018.9 },
  ],
  remaining_mmbbl: 1.59,
  months_to_limit: 15,
} satisfies DeclineResult

export const volveOutline = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { field_id: 3420717, name: 'Volve', main_product: 'oil', status: 'Shut down' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [1.8735, 58.4303],
              [1.8722, 58.4304],
              [1.8706, 58.4314],
              [1.8735, 58.4303],
            ],
          ],
        ],
      },
    },
  ],
} satisfies FieldOutlines

// Real error bodies from the backend, with the HTTP status they came with.
export const apiErrors = {
  fieldNotFound: { status: 404, body: { detail: 'no field with id 1' } },
  routeNotFound: { status: 404, body: { detail: 'Not Found' } },
  tooFewMonths: { status: 422, body: { detail: 'need at least 6 months with production to fit a decline curve' } },
  outsideProduction: { status: 422, body: { detail: 'no production data in that window' } },
  idNotANumber: {
    status: 422,
    body: {
      detail: [
        {
          type: 'int_parsing',
          loc: ['path', 'field_id'],
          msg: 'Input should be a valid integer, unable to parse string as an integer',
          input: 'volve',
        },
      ],
    },
  },
  negativeMinCum: {
    status: 422,
    body: {
      detail: [
        {
          type: 'greater_than_equal',
          loc: ['query', 'min_cum'],
          msg: 'Input should be greater than or equal to 0',
          input: '-1',
          ctx: { ge: 0.0 },
        },
      ],
    },
  },
  includeNotANumber: {
    status: 422,
    body: {
      detail: [
        {
          type: 'int_parsing',
          loc: ['query', 'include', 0],
          msg: 'Input should be a valid integer, unable to parse string as an integer',
          input: 'abc',
        },
      ],
    },
  },
  windowBackwards: {
    status: 422,
    body: {
      detail: [
        {
          type: 'value_error',
          loc: ['body'],
          msg: 'Value error, end must be after start',
          input: { field_id: 3420717, start: '2016-08', end: '2015-04' },
          ctx: { error: {} },
        },
      ],
    },
  },
  twoBadInputs: {
    status: 422,
    body: {
      detail: [
        {
          type: 'string_pattern_mismatch',
          loc: ['body', 'start'],
          msg: "String should match pattern '^\\d{4}-(0[1-9]|1[0-2])$'",
          input: 'April 2015',
          ctx: { pattern: '^\\d{4}-(0[1-9]|1[0-2])$' },
        },
        {
          type: 'enum',
          loc: ['body', 'model'],
          msg: "Input should be 'exponential', 'hyperbolic' or 'harmonic'",
          input: 'linear',
          ctx: { expected: "'exponential', 'hyperbolic' or 'harmonic'" },
        },
      ],
    },
  },
  missingField: {
    status: 422,
    body: {
      detail: [
        { type: 'missing', loc: ['body', 'field_id'], msg: 'Field required', input: { start: '2015-04', end: '2016-08' } },
      ],
    },
  },
  badJson: {
    status: 422,
    body: {
      detail: [
        { type: 'json_invalid', loc: ['body', 12], msg: 'JSON decode error', input: {}, ctx: { error: 'Expecting value' } },
      ],
    },
  },
} as const

// Volve, August 2014 to September 2016: the two years before its decline fit window, the window
// (April 2015 to August 2016) and the shutdown month. Real API values.
export const volveLateProduction = [
  { month: '2014-08', oil_rate: 1592.8, gas_rate: 246677, gor: 154.9, oe_net_msm3: 0.051876 },
  { month: '2014-09', oil_rate: 2079.6, gas_rate: 326267, gor: 156.9, oe_net_msm3: 0.064239 },
  { month: '2014-10', oil_rate: 2081.1, gas_rate: 321871, gor: 154.7, oe_net_msm3: 0.06623 },
  { month: '2014-11', oil_rate: 1764.0, gas_rate: 275767, gor: 156.3, oe_net_msm3: 0.054994 },
  { month: '2014-12', oil_rate: 591.4, gas_rate: 120032, gor: 203.0, oe_net_msm3: 0.02024 },
  { month: '2015-01', oil_rate: 2620.8, gas_rate: 386452, gor: 147.5, oe_net_msm3: 0.086984 },
  { month: '2015-02', oil_rate: 2366.9, gas_rate: 358071, gor: 151.3, oe_net_msm3: 0.070885 },
  { month: '2015-03', oil_rate: 2636.7, gas_rate: 388161, gor: 147.2, oe_net_msm3: 0.084618 },
  { month: '2015-04', oil_rate: 3007.5, gas_rate: 438500, gor: 145.8, oe_net_msm3: 0.092078 },
  { month: '2015-05', oil_rate: 2808.5, gas_rate: 409710, gor: 145.9, oe_net_msm3: 0.089668 },
  { month: '2015-06', oil_rate: 2794.9, gas_rate: 409233, gor: 146.4, oe_net_msm3: 0.08617 },
  { month: '2015-07', oil_rate: 2386.9, gas_rate: 354839, gor: 148.7, oe_net_msm3: 0.0768 },
  { month: '2015-08', oil_rate: 1816.0, gas_rate: 275000, gor: 151.4, oe_net_msm3: 0.058063 },
  { month: '2015-09', oil_rate: 2103.2, gas_rate: 317267, gor: 150.8, oe_net_msm3: 0.065158 },
  { month: '2015-10', oil_rate: 1860.7, gas_rate: 283548, gor: 152.4, oe_net_msm3: 0.060032 },
  { month: '2015-11', oil_rate: 2015.6, gas_rate: 308533, gor: 153.1, oe_net_msm3: 0.06213 },
  { month: '2015-12', oil_rate: 1929.5, gas_rate: 295613, gor: 153.2, oe_net_msm3: 0.062236 },
  { month: '2016-01', oil_rate: 1663.8, gas_rate: 260516, gor: 156.6, oe_net_msm3: 0.059042 },
  { month: '2016-02', oil_rate: 1633.4, gas_rate: 257552, gor: 157.7, oe_net_msm3: 0.05417 },
  { month: '2016-03', oil_rate: 1380.7, gas_rate: 222581, gor: 161.2, oe_net_msm3: 0.049197 },
  { month: '2016-04', oil_rate: 1077.0, gas_rate: 176267, gor: 163.7, oe_net_msm3: 0.036741 },
  { month: '2016-05', oil_rate: 1259.0, gas_rate: 200484, gor: 159.2, oe_net_msm3: 0.044074 },
  { month: '2016-06', oil_rate: 1188.6, gas_rate: 191300, gor: 160.9, oe_net_msm3: 0.040467 },
  { month: '2016-07', oil_rate: 1001.9, gas_rate: 160968, gor: 160.7, oe_net_msm3: 0.037133 },
  { month: '2016-08', oil_rate: 805.0, gas_rate: 128742, gor: 159.9, oe_net_msm3: 0.026902 },
  { month: '2016-09', oil_rate: 287.0, gas_rate: 48633, gor: 169.5, oe_net_msm3: 0.009581 },
] satisfies ProductionMonth[]

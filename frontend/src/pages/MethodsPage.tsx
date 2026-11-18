import type { ReactNode } from 'react'
import { ChartCard } from '@/components/ChartCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { useSnapshot } from '@/components/layout/snapshot-context'
import { Skeleton } from '@/components/ui/skeleton'
import { LIFECYCLE_MIN_CUM, LIFECYCLE_MIN_YEARS, VOLVE_RECOVERY_PERCENT, pageTitle } from '@/config'
import type { Snapshot } from '@/lib/api/types'
import { BACKEND_RULES as R } from '@/lib/backend-rules'
import { ECONOMIC_LIMIT, FORECAST_MONTHS, WEAK_FIT_R2 } from '@/lib/decline'
import { formatMonth, formatNumber } from '@/lib/format'
import { SM3_TO_BBL } from '@/lib/units'

const nearPeakPercent = Math.round((1 - R.nearPeakShare) * 100)

function Prose({ children }: { children: ReactNode }) {
  return <div className="flex max-w-[72ch] flex-col gap-3 text-sm leading-relaxed">{children}</div>
}

function Formula({ children }: { children: ReactNode }) {
  return <code className="rounded-md bg-muted px-3 py-2 font-mono text-[13px]">{children}</code>
}

function DataSource({ snapshot }: { snapshot: Snapshot }) {
  const downloaded = new Date(snapshot.downloaded_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const missing = snapshot.fields_without_outline
  return (
    <>
      <p>
        All numbers come from one download of Sodir&apos;s open data, made on {downloaded}. It holds{' '}
        {formatNumber(snapshot.production_rows)} rows of monthly production for {snapshot.fields} fields, up to{' '}
        {formatMonth(snapshot.last_month, 'long')}, shared under the {snapshot.licence} licence.
      </p>
      <p>
        Totals include the months of the unfinished year up to {formatMonth(snapshot.last_month, 'long')}. Charts by year
        stop at {snapshot.last_full_year}, the last full year.
      </p>
      <p>
        {formatNumber(snapshot.rows_with_negative_adjustments)} monthly rows have negative values. They are kept in the
        totals, and a negative monthly rate is shown as zero.
      </p>
      {missing.length > 0 && (
        <p>
          {missing.join(', ')} {missing.length === 1 ? 'has' : 'have'} no outline in the data, so{' '}
          {missing.length === 1 ? 'it is' : 'they are'} not on the map.
        </p>
      )}
    </>
  )
}

const UNITS: [unit: string, meaning: string][] = [
  ['Sm³', 'Standard cubic metre, the unit Sodir reports volumes in.'],
  ['Million Sm³', 'Oil, NGL and condensate volumes.'],
  ['Billion Sm³', 'Gas volumes.'],
  ['Sm³/day', "Rates. A month's volume divided by the number of days in that month."],
  ['Sm³ o.e.', 'Oil equivalent, oil and gas counted together as one number, as Sodir reports it.'],
  ['bbl, MMbbl', `Barrels and million barrels. The app uses 1 Sm³ of oil = ${formatNumber(SM3_TO_BBL, 4)} barrels.`],
  ['Sm³/Sm³', `Gas oil ratio, gas per unit of oil from the monthly rates. It is left empty when oil is ${R.minOilForGor} Sm³/day or less, or no gas was reported.`],
  ['Million NOK', 'Investment in Norwegian kroner, not adjusted for inflation.'],
]

export function MethodsPage() {
  const snapshot = useSnapshot()

  return (
    <>
      <title>{pageTitle('Methods')}</title>
      <PageHeader title="Methods" description="Where the numbers come from, the units they use, and how each chart is worked out." />
      <div className="flex flex-col gap-4">
        <ChartCard title="The data" busy={snapshot.status === 'loading'}>
          <Prose>
            {snapshot.status === 'ready' && <DataSource snapshot={snapshot.data} />}
            {snapshot.status === 'loading' && <Skeleton className="h-24 w-full" />}
            {snapshot.status === 'error' && (
              <p>All numbers come from one download of Sodir&apos;s open data. The details of the download could not be loaded.</p>
            )}
            <p>
              The one number not from Sodir is Volve&apos;s recovery rate of {VOLVE_RECOVERY_PERCENT}%, published by Equinor. It is
              shown only for Volve, with its source.
            </p>
          </Prose>
        </ChartCard>

        <ChartCard title="Units">
          <div className="overflow-x-auto">
            <table className="w-full max-w-[72ch] text-sm">
              <caption className="sr-only">Units used in the atlas</caption>
              <thead>
                <tr className="border-b text-left text-[13px] text-muted-foreground">
                  <th scope="col" className="h-10 pr-4 font-medium">Unit</th>
                  <th scope="col" className="h-10 font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {UNITS.map(([unit, meaning]) => (
                  <tr key={unit} className="border-b last:border-0">
                    <th scope="row" className="py-2.5 pr-4 text-left align-top font-mono text-[13px] font-medium whitespace-nowrap">
                      {unit}
                    </th>
                    <td className="py-2.5 leading-relaxed">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Prose>
              <p>
                Sodir reports gross volumes and saleable (net) volumes. The rates, the total oil and the decline curve on the
                field deep dive use gross volumes. The shelf totals, the largest fields table and the lifecycles use saleable volumes. On the shelf
                charts, &quot;oil&quot; means oil, NGL and condensate together.
              </p>
            </Prose>
          </div>
        </ChartCard>

        <ChartCard title="Decline curves" description="The forecast on the field deep dive.">
          <Prose>
            <p>
              The app fits an Arps decline curve to the field&apos;s monthly oil rate. Arps describes how a rate falls over time,
              with three versions:
            </p>
            <div className="flex flex-col gap-2">
              <p>Exponential, b = 0</p>
              <Formula>q(t) = qi × e^(−Di × t)</Formula>
              <p>Hyperbolic, b between 0 and 1</p>
              <Formula>q(t) = qi ÷ (1 + b × Di × t)^(1 ÷ b)</Formula>
              <p>Harmonic, b = 1</p>
              <Formula>q(t) = qi ÷ (1 + Di × t)</Formula>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="font-mono">q(t)</dt>
              <dd>The oil rate in Sm³/day, t months after the start of the fit window.</dd>
              <dt className="font-mono">qi</dt>
              <dd>The rate at the start of the window.</dd>
              <dt className="font-mono">Di</dt>
              <dd>The decline rate at the start, per month. The page shows it as a yearly percent, Di × 12 × 100.</dd>
              <dt className="font-mono">b</dt>
              <dd>How fast the decline itself slows down.</dd>
            </dl>
            <p>
              The hyperbolic fit may choose b from {formatNumber(R.bMin, 2)} to {formatNumber(R.bMax, 0)}. When it ends at one of
              those edges, the page says the decline is really exponential or harmonic, and does not show b as a precise number.
            </p>
            <p>
              The fit uses the logarithm of the rate, so a month at 3,000 Sm³/day and a month at 300 Sm³/day count the same.
              Fitting the raw rates would let the early, high months decide the curve. Months with no production are left
              out, and at least {R.minFitMonths} months are needed.
            </p>
            <p>
              R² says how well the curve follows the logarithm of the rate, and 1 is a perfect fit. Below{' '}
              {formatNumber(WEAK_FIT_R2, 1)} the page calls the forecast very rough.
            </p>
            <p>
              The fit window is chosen the same way for every field. It ends at the last month at or above the economic limit,
              and starts at the highest month in the two years before that, so it covers the latest decline. It is at least 12
              months long.
            </p>
            <p>
              The economic limit is {ECONOMIC_LIMIT} Sm³/day. It is an example setting, not the real limit of any field. The
              forecast runs {FORECAST_MONTHS} months past the window. Its range is a rough 95% range, built from how far the
              real months scatter around the curve and widened the further ahead it reaches. It shows how uncertain the forecast
              is, and is not a formal statistical interval.
            </p>
            <p>
              &quot;If the field had kept running&quot; adds up the forecast from the end of the window until the rate drops below
              the economic limit, looking up to {R.maxForecastMonths / 12} years ahead, and turns it into barrels.
            </p>
          </Prose>
        </ChartCard>

        <ChartCard title="Field lifecycles">
          <Prose>
            <p>
              Each field&apos;s yearly saleable production in oil equivalent is divided by its own best year, so the best year
              is 100%. Years are counted from the field&apos;s first year with production, which is year 0. The unfinished
              current year is left out.
            </p>
            <p>
              The page compares fields that produced at least {LIFECYCLE_MIN_CUM} million Sm³ o.e. in total and have at least{' '}
              {LIFECYCLE_MIN_YEARS} years with production. A field that paused production has a break in its line.
            </p>
            <p>
              A year is near peak when it is within {nearPeakPercent}% of the best year. The median line is the middle value
              of all fields at each age, drawn only where at least {R.minFieldsForMedian} fields reached that age. The typical
              best year and typical time near peak are medians over all the fields compared.
            </p>
          </Prose>
        </ChartCard>

        <ChartCard title="Shelf map">
          <Prose>
            <p>
              Each circle sits at the centre of the field&apos;s outline. Its area grows with the field&apos;s total saleable
              production to date, and its colour shows the main product from Sodir.
            </p>
            <p>
              A field counts as producing in a year when it has any saleable production in that year. The count under the year
              slider and the filled circles both use this rule.
            </p>
          </Prose>
        </ChartCard>
      </div>
    </>
  )
}

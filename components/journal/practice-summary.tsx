"use client"

/**
 * Streaks, totals, and a year of practice as a calendar.
 *
 * The register here is deliberate: this reports what happened, it does not assess it. There is
 * no target, no percentage of a goal, no comparison against other people, and no reading of what
 * a pattern means. A calendar you can glance at to confirm you have been sitting is useful; a
 * scoreboard that makes a missed day feel like a failure is the opposite of the point.
 *
 * All the arithmetic lives in lib/sessions.ts and is tested there.
 */

import { useMemo } from "react"

import {
  DEFAULT_DAY_BOUNDARY_HOUR,
  type PracticeSession,
  computeStreak,
  computeTotals,
  practiceDayKey,
  previousDayKey,
  summarizeByDay,
} from "@/lib/sessions"
import { cn } from "@/lib/utils"

const WEEKS_SHOWN = 26
const DAYS_SHOWN = WEEKS_SHOWN * 7

/** Total practice, in the largest unit that still reads as a real quantity. */
const formatTotal = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 60) return "0 min"
  const minutes = Math.round(seconds / 60)
  if (minutes < 90) return `${minutes} min`
  const hours = minutes / 60
  return hours < 10 ? `${hours.toFixed(1)} hr` : `${Math.round(hours)} hr`
}

const formatDayLabel = (dayKey: string, totalSeconds: number, sits: number): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey)
  if (!match) return dayKey
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  const when = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)
  if (sits === 0) return `${when} — no sit`
  return `${when} — ${sits} ${sits === 1 ? "sit" : "sits"}, ${formatTotal(totalSeconds)}`
}

/**
 * Five steps rather than a continuous scale. The distinction that matters is "sat / did not sit";
 * the shading beyond that is texture, not information worth reading precisely.
 */
const intensityClass = (seconds: number): string => {
  if (seconds <= 0) return "bg-muted"
  if (seconds < 10 * 60) return "bg-logo-teal-400/30"
  if (seconds < 25 * 60) return "bg-logo-teal-400/55"
  if (seconds < 45 * 60) return "bg-logo-teal-500/75"
  return "bg-logo-teal-600"
}

export function PracticeSummary({
  sessions,
  dayBoundaryHour = DEFAULT_DAY_BOUNDARY_HOUR,
}: {
  sessions: PracticeSession[]
  dayBoundaryHour?: number
}) {
  const { streak, totals, days } = useMemo(() => {
    const byDay = new Map(
      summarizeByDay(sessions, { dayBoundaryHour }).map((day) => [day.dayKey, day] as const),
    )

    // Walk back from today so the grid always ends on today, whether or not it has a sit.
    const today = practiceDayKey(new Date(), dayBoundaryHour)
    const walked: { dayKey: string; sits: number; totalSeconds: number }[] = []
    let cursor = today
    for (let index = 0; index < DAYS_SHOWN && cursor; index += 1) {
      walked.push(byDay.get(cursor) ?? { dayKey: cursor, sits: 0, totalSeconds: 0 })
      cursor = previousDayKey(cursor)
    }

    return {
      streak: computeStreak(sessions, { dayBoundaryHour }),
      totals: computeTotals(sessions, { dayBoundaryHour }),
      days: walked.reverse(),
    }
  }, [sessions, dayBoundaryHour])

  const last30 = days.slice(-30).filter((day) => day.totalSeconds > 0).length

  // Column-major so each column is a week, the way a calendar reads.
  const weeks: (typeof days)[] = []
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7))
  }

  return (
    <section className="mx-auto max-w-3xl px-4 pt-4 md:px-8 md:pt-8">
      <div className="rounded-xl border-[3px] border-muted bg-gradient-to-br from-white to-stone-50 p-4 md:p-5">
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Current streak" value={streak.current} unit={streak.current === 1 ? "day" : "days"} />
          <Stat label="Longest" value={streak.longest} unit={streak.longest === 1 ? "day" : "days"} />
          <Stat label="Last 30 days" value={last30} unit={last30 === 1 ? "day" : "days"} />
          <Stat label="Total" value={formatTotal(totals.totalSeconds)} unit={`${totals.sits} sits`} />
        </div>

        <div className="overflow-x-auto">
          <div className="flex gap-[3px]" role="img" aria-label={`Practice over the last ${WEEKS_SHOWN} weeks`}>
            {weeks.map((week) => (
              <div key={week[0]?.dayKey ?? Math.random()} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <span
                    key={day.dayKey}
                    title={formatDayLabel(day.dayKey, day.totalSeconds, day.sits)}
                    className={cn("h-[11px] w-[11px] flex-shrink-0 rounded-[2px]", intensityClass(day.totalSeconds))}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-3 font-serif text-[11px] tracking-tight text-gray-400">
          {totals.sits === 0
            ? "Sits appear here once you have practised."
            : `${WEEKS_SHOWN} weeks. Darker is longer.`}
        </p>
      </div>
    </section>
  )
}

function Stat({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <div className="rounded-[10px] bg-muted/50 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">{label}</p>
      <p className="mt-0.5 font-serif text-lg font-black leading-none tracking-tight text-gray-700">{value}</p>
      <p className="mt-1 font-serif text-[11px] tracking-tight text-gray-400">{unit}</p>
    </div>
  )
}

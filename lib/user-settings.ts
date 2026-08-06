/**
 * Per-account preferences.
 *
 * These live in `user_settings.settings`, a single jsonb column that has existed since migration
 * 010 and gone unread ever since — every preference the app has was either hardcoded or stashed
 * in `localStorage`, which is why quick-adjust presets do not follow you between devices.
 *
 * The column is schemaless, so this module is where the shape is actually enforced. `normalize`
 * is total: it takes anything at all — a fresh account's `{}`, a row written by an older build,
 * a value someone hand-edited in the dashboard — and returns a complete, valid settings object.
 * Nothing downstream should ever have to null-check a preference.
 *
 * Pure: no React, no network.
 */

import { DEFAULT_DAY_BOUNDARY_HOUR } from "@/lib/sessions"

export type UserSettings = {
  /**
   * The hour that divides one practice day from the next, 0–23. A sit before this hour counts
   * toward the previous day, so sitting at 1am does not cost you a streak.
   */
  dayBoundaryHour: number
  timer: {
    /** Seconds. What the wheel starts on. */
    defaultDurationSeconds: number
    /** Seconds of silence before the opening bell. */
    warmupSeconds: number
    /** Seconds between interval bells; 0 for none. */
    intervalSeconds: number
    bellId: string
    /** 0–1. */
    bellVolume: number
    openingBell: boolean
    closingBell: boolean
  }
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  dayBoundaryHour: DEFAULT_DAY_BOUNDARY_HOUR,
  timer: {
    defaultDurationSeconds: 20 * 60,
    warmupSeconds: 30,
    intervalSeconds: 0,
    bellId: "bowl",
    bellVolume: 0.8,
    openingBell: true,
    closingBell: true,
  },
}

/** Longest sit the wheel will restore to. Beyond this, a stored value is treated as corrupt. */
const MAX_TIMER_DURATION_SECONDS = 24 * 60 * 60

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const intIn = (value: unknown, min: number, max: number, fallback: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  const rounded = Math.trunc(value)
  if (rounded < min) return min
  if (rounded > max) return max
  return rounded
}

const fractionOr = (value: unknown, fallback: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return Math.max(0, Math.min(1, value))
}

const boolOr = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback

const stringOr = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback

/**
 * Coerces stored JSON into a complete settings object. Unknown keys are dropped and invalid
 * values fall back to their default rather than throwing — a preference is never important
 * enough to fail a page load over.
 */
export const normalizeSettings = (stored: unknown): UserSettings => {
  const source = isRecord(stored) ? stored : {}
  const timerSource = isRecord(source.timer) ? source.timer : {}
  const defaults = DEFAULT_USER_SETTINGS

  return {
    dayBoundaryHour: intIn(source.dayBoundaryHour, 0, 23, defaults.dayBoundaryHour),
    timer: {
      defaultDurationSeconds: intIn(
        timerSource.defaultDurationSeconds,
        1,
        MAX_TIMER_DURATION_SECONDS,
        defaults.timer.defaultDurationSeconds,
      ),
      warmupSeconds: intIn(timerSource.warmupSeconds, 0, 3600, defaults.timer.warmupSeconds),
      intervalSeconds: intIn(timerSource.intervalSeconds, 0, MAX_TIMER_DURATION_SECONDS, defaults.timer.intervalSeconds),
      bellId: stringOr(timerSource.bellId, defaults.timer.bellId),
      bellVolume: fractionOr(timerSource.bellVolume, defaults.timer.bellVolume),
      openingBell: boolOr(timerSource.openingBell, defaults.timer.openingBell),
      closingBell: boolOr(timerSource.closingBell, defaults.timer.closingBell),
    },
  }
}

/** Applies a partial update on top of current settings, re-normalizing the result. */
export const mergeSettings = (current: UserSettings, patch: DeepPartial<UserSettings>): UserSettings =>
  normalizeSettings({
    ...current,
    ...patch,
    timer: { ...current.timer, ...(patch.timer ?? {}) },
  })

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K]
}

/** Human label for the day boundary, for the settings UI. */
export const formatDayBoundary = (hour: number): string => {
  const safe = intIn(hour, 0, 23, DEFAULT_DAY_BOUNDARY_HOUR)
  if (safe === 0) return "Midnight"
  if (safe === 12) return "Noon"
  const suffix = safe < 12 ? "am" : "pm"
  const display = safe % 12 === 0 ? 12 : safe % 12
  return `${display}${suffix}`
}

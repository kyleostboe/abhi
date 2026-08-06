/**
 * Ordering for the library.
 *
 * Three of the six orders are questions about practice rather than about files — what did I sit
 * with recently, what do I come back to, what have I been ignoring — so they read from the
 * sessions log rather than from the meditation rows. That is only possible now that a sit is
 * recorded independently of whether anything was written about it.
 *
 * Generic over the row shape and free of React, the DOM and Supabase, so the comparators can be
 * tested directly.
 */

export const LIBRARY_SORTS = [
  "recent",
  "recently-played",
  "most-played",
  "longest-unplayed",
  "longest",
  "title",
] as const

export type LibrarySort = (typeof LIBRARY_SORTS)[number]

export const DEFAULT_LIBRARY_SORT: LibrarySort = "recent"

export const LIBRARY_SORT_LABELS: Record<LibrarySort, string> = {
  recent: "Recently added",
  "recently-played": "Recently played",
  "most-played": "Most played",
  "longest-unplayed": "Longest unplayed",
  longest: "Longest",
  title: "Title",
}

export const isLibrarySort = (value: unknown): value is LibrarySort =>
  typeof value === "string" && (LIBRARY_SORTS as readonly string[]).includes(value)

export type PlayStats = {
  /** Epoch ms of the most recent sit, or null if it has never been played. */
  lastPlayedAt: number | null
  playCount: number
}

const EMPTY_STATS: PlayStats = { lastPlayedAt: null, playCount: 0 }

type SessionLike = {
  meditationId: string | null
  startedAt: string
  durationActual: number
}

/**
 * Play counts and last-played times, keyed by meditation.
 *
 * Only sits past the practice floor count, so opening something and immediately closing it does
 * not make it look played — which matters most for "longest unplayed", where a stray tap would
 * otherwise hide exactly the thing the order exists to surface.
 */
export const buildPlayStats = (
  sessions: readonly SessionLike[],
  options: { minSeconds?: number } = {},
): Map<string, PlayStats> => {
  const minSeconds = options.minSeconds ?? 60
  const stats = new Map<string, PlayStats>()

  for (const session of sessions) {
    const id = session.meditationId
    if (!id) continue
    if (!(typeof session.durationActual === "number" && session.durationActual >= minSeconds)) continue

    const startedAt = new Date(session.startedAt).getTime()
    if (Number.isNaN(startedAt)) continue

    const existing = stats.get(id)
    if (existing) {
      existing.playCount += 1
      if (existing.lastPlayedAt === null || startedAt > existing.lastPlayedAt) existing.lastPlayedAt = startedAt
    } else {
      stats.set(id, { lastPlayedAt: startedAt, playCount: 1 })
    }
  }

  return stats
}

export type SortableRow = {
  id: string
  title: string
  duration: number
  createdAt: Date
}

const timeOf = (value: Date): number => {
  const time = value instanceof Date ? value.getTime() : Number.NaN
  return Number.isNaN(time) ? 0 : time
}

const durationOf = (value: number): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0

/**
 * Orders rows without mutating the input.
 *
 * Every comparator falls back to newest-first and then to id, so the order is total: two
 * meditations added in the same millisecond, or two that have never been played, still come out
 * in a stable sequence rather than shuffling between renders.
 */
export const sortLibraryRows = <T extends SortableRow>(
  rows: readonly T[],
  sort: LibrarySort,
  stats: Map<string, PlayStats> = new Map(),
): T[] => {
  const statsFor = (row: T): PlayStats => stats.get(row.id) ?? EMPTY_STATS

  const byNewest = (a: T, b: T) => timeOf(b.createdAt) - timeOf(a.createdAt) || a.id.localeCompare(b.id)

  const comparators: Record<LibrarySort, (a: T, b: T) => number> = {
    recent: byNewest,

    "recently-played": (a, b) => {
      const left = statsFor(a).lastPlayedAt
      const right = statsFor(b).lastPlayedAt
      // Never-played sink to the bottom: this order is a history, and something with no history
      // does not belong at the top of it.
      if (left === null && right === null) return byNewest(a, b)
      if (left === null) return 1
      if (right === null) return -1
      return right - left || byNewest(a, b)
    },

    "most-played": (a, b) => statsFor(b).playCount - statsFor(a).playCount || byNewest(a, b),

    "longest-unplayed": (a, b) => {
      const left = statsFor(a).lastPlayedAt
      const right = statsFor(b).lastPlayedAt
      // Never-played rise to the top: nothing has been unplayed for longer.
      if (left === null && right === null) return byNewest(a, b)
      if (left === null) return -1
      if (right === null) return 1
      return left - right || byNewest(a, b)
    },

    longest: (a, b) => durationOf(b.duration) - durationOf(a.duration) || byNewest(a, b),

    title: (a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true }) || byNewest(a, b),
  }

  return [...rows].sort(comparators[sort] ?? comparators.recent)
}

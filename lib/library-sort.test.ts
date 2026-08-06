import { describe, expect, it } from "vitest"

import {
  DEFAULT_LIBRARY_SORT,
  type SortableRow,
  buildPlayStats,
  isLibrarySort,
  sortLibraryRows,
} from "./library-sort"

const row = (id: string, overrides: Partial<SortableRow> = {}): SortableRow => ({
  id,
  title: id,
  duration: 600,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
})

const session = (meditationId: string | null, startedAt: string, durationActual = 900) => ({
  meditationId,
  startedAt,
  durationActual,
})

const ids = (rows: SortableRow[]) => rows.map((r) => r.id)

describe("buildPlayStats", () => {
  it("counts sits and records the most recent", () => {
    const stats = buildPlayStats([
      session("a", "2026-03-01T10:00:00Z"),
      session("a", "2026-03-05T10:00:00Z"),
      session("b", "2026-03-03T10:00:00Z"),
    ])

    expect(stats.get("a")).toEqual({ playCount: 2, lastPlayedAt: new Date("2026-03-05T10:00:00Z").getTime() })
    expect(stats.get("b")?.playCount).toBe(1)
  })

  it("keeps the latest even when sessions arrive out of order", () => {
    const stats = buildPlayStats([
      session("a", "2026-03-05T10:00:00Z"),
      session("a", "2026-03-01T10:00:00Z"),
    ])

    expect(stats.get("a")?.lastPlayedAt).toBe(new Date("2026-03-05T10:00:00Z").getTime())
  })

  it("ignores sits below the practice floor", () => {
    const stats = buildPlayStats([session("a", "2026-03-01T10:00:00Z", 5)])
    expect(stats.has("a")).toBe(false)
  })

  it("ignores timer sits, which have no meditation", () => {
    const stats = buildPlayStats([session(null, "2026-03-01T10:00:00Z")])
    expect(stats.size).toBe(0)
  })

  it("ignores unparseable timestamps", () => {
    const stats = buildPlayStats([session("a", "not a date")])
    expect(stats.size).toBe(0)
  })

  it("honours a custom floor", () => {
    const stats = buildPlayStats([session("a", "2026-03-01T10:00:00Z", 30)], { minSeconds: 10 })
    expect(stats.get("a")?.playCount).toBe(1)
  })

  it("is empty for no sessions", () => {
    expect(buildPlayStats([]).size).toBe(0)
  })
})

describe("sortLibraryRows", () => {
  it("does not mutate the input", () => {
    const rows = [row("b"), row("a")]
    const copy = [...rows]
    sortLibraryRows(rows, "title")
    expect(rows).toEqual(copy)
  })

  it("orders by newest first by default", () => {
    const rows = [
      row("old", { createdAt: new Date("2026-01-01T00:00:00Z") }),
      row("new", { createdAt: new Date("2026-05-01T00:00:00Z") }),
    ]
    expect(ids(sortLibraryRows(rows, "recent"))).toEqual(["new", "old"])
  })

  it("orders by title, case- and number-aware", () => {
    const rows = [row("c", { title: "beta" }), row("a", { title: "Alpha" }), row("b", { title: "gamma 10" })]
    expect(ids(sortLibraryRows(rows, "title"))).toEqual(["a", "c", "b"])
  })

  it("orders by duration, longest first", () => {
    const rows = [row("short", { duration: 300 }), row("long", { duration: 3600 })]
    expect(ids(sortLibraryRows(rows, "longest"))).toEqual(["long", "short"])
  })

  it("treats a missing duration as zero rather than sorting it first", () => {
    const rows = [row("broken", { duration: Number.NaN }), row("real", { duration: 600 })]
    expect(ids(sortLibraryRows(rows, "longest"))).toEqual(["real", "broken"])
  })

  describe("recently-played", () => {
    const stats = buildPlayStats([
      session("a", "2026-03-01T10:00:00Z"),
      session("b", "2026-03-09T10:00:00Z"),
    ])
    const rows = [row("a"), row("b"), row("never")]

    it("puts the most recently played first", () => {
      expect(ids(sortLibraryRows(rows, "recently-played", stats)).slice(0, 2)).toEqual(["b", "a"])
    })

    it("sinks never-played to the bottom", () => {
      expect(ids(sortLibraryRows(rows, "recently-played", stats))[2]).toBe("never")
    })
  })

  describe("longest-unplayed", () => {
    const stats = buildPlayStats([
      session("a", "2026-03-01T10:00:00Z"),
      session("b", "2026-03-09T10:00:00Z"),
    ])
    const rows = [row("a"), row("b"), row("never")]

    it("puts never-played first, since nothing has been unplayed longer", () => {
      expect(ids(sortLibraryRows(rows, "longest-unplayed", stats))[0]).toBe("never")
    })

    it("then orders by how long ago each was played", () => {
      expect(ids(sortLibraryRows(rows, "longest-unplayed", stats))).toEqual(["never", "a", "b"])
    })
  })

  it("orders by play count", () => {
    const stats = buildPlayStats([
      session("a", "2026-03-01T10:00:00Z"),
      session("a", "2026-03-02T10:00:00Z"),
      session("a", "2026-03-03T10:00:00Z"),
      session("b", "2026-03-02T10:00:00Z"),
    ])
    expect(ids(sortLibraryRows([row("b"), row("never"), row("a")], "most-played", stats))).toEqual([
      "a",
      "b",
      "never",
    ])
  })

  it("is stable for rows that tie on everything but id", () => {
    const rows = [row("c"), row("a"), row("b")]
    expect(ids(sortLibraryRows(rows, "recent"))).toEqual(["a", "b", "c"])
    expect(ids(sortLibraryRows(rows, "most-played"))).toEqual(["a", "b", "c"])
  })

  it("falls back to the default order for an unknown sort", () => {
    const rows = [row("a", { createdAt: new Date("2026-01-01T00:00:00Z") }), row("b", { createdAt: new Date("2026-05-01T00:00:00Z") })]
    expect(ids(sortLibraryRows(rows, "nonsense" as never))).toEqual(ids(sortLibraryRows(rows, DEFAULT_LIBRARY_SORT)))
  })

  it("handles an empty list", () => {
    expect(sortLibraryRows([], "recently-played")).toEqual([])
  })
})

describe("isLibrarySort", () => {
  it("accepts the known sorts and rejects anything else", () => {
    expect(isLibrarySort("most-played")).toBe(true)
    expect(isLibrarySort("recent")).toBe(true)
    expect(isLibrarySort("sideways")).toBe(false)
    expect(isLibrarySort(null)).toBe(false)
    expect(isLibrarySort(3)).toBe(false)
  })
})

import { describe, expect, it } from "vitest"

import {
  type SessionNoteDraft,
  draftHasContent,
  draftSubtitle,
  draftTitle,
  parseSessionNoteDraft,
} from "./journal-draft"

const draft = (overrides: Partial<SessionNoteDraft> = {}): SessionNoteDraft => ({
  sessionId: "s1",
  meditationId: "m1",
  meditationTitle: "Body scan",
  startedAt: new Date(2026, 2, 14, 7, 30).toISOString(),
  durationActual: 1800,
  source: "guided",
  ...overrides,
})

describe("parseSessionNoteDraft", () => {
  it("round-trips a complete draft", () => {
    const original = draft()
    expect(parseSessionNoteDraft(JSON.parse(JSON.stringify(original)))).toEqual(original)
  })

  it("rejects anything that is not an object", () => {
    for (const value of [null, undefined, "s1", 4, [], true]) {
      expect(parseSessionNoteDraft(value)).toBeNull()
    }
  })

  it("requires a session id", () => {
    expect(parseSessionNoteDraft({ ...draft(), sessionId: "" })).toBeNull()
    expect(parseSessionNoteDraft({ ...draft(), sessionId: undefined })).toBeNull()
  })

  it("requires a usable start time", () => {
    expect(parseSessionNoteDraft({ ...draft(), startedAt: "whenever" })).toBeNull()
    expect(parseSessionNoteDraft({ ...draft(), startedAt: "" })).toBeNull()
  })

  it("allows a timer sit, which has no meditation", () => {
    const parsed = parseSessionNoteDraft({ ...draft({ meditationId: null, meditationTitle: null, source: "timer" }) })
    expect(parsed?.meditationId).toBeNull()
    expect(parsed?.source).toBe("timer")
  })

  it("treats an unknown source as guided", () => {
    expect(parseSessionNoteDraft({ ...draft(), source: "elsewhere" })?.source).toBe("guided")
  })

  it("clamps a broken duration to zero rather than dropping the draft", () => {
    expect(parseSessionNoteDraft({ ...draft(), durationActual: Number.NaN })?.durationActual).toBe(0)
    expect(parseSessionNoteDraft({ ...draft(), durationActual: -5 })?.durationActual).toBe(0)
  })
})

describe("draftTitle", () => {
  it("uses the meditation's name", () => {
    expect(draftTitle(draft())).toBe("Body scan")
  })

  it("names a timer sit for what it is", () => {
    expect(draftTitle(draft({ meditationTitle: null, source: "timer" }))).toBe("Timer sit")
  })

  it("falls back when a title is blank", () => {
    expect(draftTitle(draft({ meditationTitle: "   " }))).toBe("Meditation")
  })
})

describe("draftSubtitle", () => {
  const now = new Date(2026, 2, 14, 20, 0)

  it("gives length and time for a sit earlier today", () => {
    expect(draftSubtitle(draft(), now)).toBe("30 minutes · 7:30 AM")
  })

  it("includes the date for a sit on another day", () => {
    const older = draft({ startedAt: new Date(2026, 2, 11, 7, 30).toISOString() })
    expect(draftSubtitle(older, now)).toBe("30 minutes · Mar 11, 7:30 AM")
  })

  it("says an hour properly", () => {
    expect(draftSubtitle(draft({ durationActual: 3600 }), now)).toContain("1 hour")
    expect(draftSubtitle(draft({ durationActual: 5400 }), now)).toContain("1 hour 30 min")
    expect(draftSubtitle(draft({ durationActual: 7200 }), now)).toContain("2 hours")
  })

  it("handles a single minute and less", () => {
    expect(draftSubtitle(draft({ durationActual: 60 }), now)).toContain("1 minute")
    expect(draftSubtitle(draft({ durationActual: 10 }), now)).toContain("a few moments")
    expect(draftSubtitle(draft({ durationActual: 0 }), now)).toContain("a few moments")
  })
})

describe("draftHasContent", () => {
  it("counts real writing", () => {
    expect(draftHasContent("today was difficult")).toBe(true)
    expect(draftHasContent("# heading")).toBe(true)
  })

  it("does not count an empty or whitespace-only document", () => {
    expect(draftHasContent("")).toBe(false)
    expect(draftHasContent("   ")).toBe(false)
    expect(draftHasContent("\n\n")).toBe(false)
    expect(draftHasContent("\n \t \r\n")).toBe(false)
  })

  it("does not count a missing value", () => {
    expect(draftHasContent(null)).toBe(false)
    expect(draftHasContent(undefined)).toBe(false)
  })
})

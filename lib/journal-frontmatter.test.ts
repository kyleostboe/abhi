import { describe, expect, it } from "vitest"
import { composeNoteFile, parseNoteFile, type NoteFrontmatter } from "./journal-frontmatter"

const base: NoteFrontmatter = {
  title: "Morning sit",
  slug: "morning-sit",
  date: "2026-01-04T07:00:00.000Z",
  updated: "2026-01-04T07:30:00.000Z",
}

describe("composeNoteFile", () => {
  it("writes a frontmatter block followed by the body", () => {
    const file = composeNoteFile(base, "Body text.")
    expect(file.startsWith("---\n")).toBe(true)
    expect(file).toContain("title: Morning sit")
    expect(file).toContain("slug: morning-sit")
    expect(file.endsWith("Body text.\n")).toBe(true)
  })

  it("always emits visibility and tags, even when unset", () => {
    const file = composeNoteFile(base, "x")
    expect(file).toContain("visibility: private")
    expect(file).toContain("tags: []")
  })

  it("omits optional keys that have no value", () => {
    const file = composeNoteFile(base, "x")
    expect(file).not.toContain("folder:")
    expect(file).not.toContain("meditation:")
    expect(file).not.toContain("practice_type:")
  })

  it("quotes only values that YAML actually requires quoting", () => {
    const file = composeNoteFile({ ...base, title: "Sit: part two", folder: "Retreats" }, "x")
    expect(file).toContain('title: "Sit: part two"')
    // No colon-space, so no quotes needed.
    expect(file).toContain("folder: Retreats")
  })

  it("escapes embedded quotes and backslashes", () => {
    const file = composeNoteFile({ ...base, title: 'a "quoted" \\ thing' }, "x")
    expect(parseNoteFile(file).frontmatter.title).toBe('a "quoted" \\ thing')
  })
})

describe("parseNoteFile", () => {
  it("round-trips a fully populated frontmatter block", () => {
    const full: NoteFrontmatter = {
      ...base,
      folder: "Retreats",
      meditation: "Body Scan",
      meditationSlug: "body-scan",
      practiceType: "vipassana",
      tags: ["morning", "retreat"],
      font: "serif",
      visibility: "private",
    }
    const parsed = parseNoteFile(composeNoteFile(full, "The body."))
    expect(parsed.frontmatter).toEqual(full)
    expect(parsed.body).toBe("The body.")
  })

  it("treats a file with no frontmatter as all body", () => {
    const parsed = parseNoteFile("Just a note, no header.")
    expect(parsed.frontmatter).toEqual({})
    expect(parsed.body).toBe("Just a note, no header.")
  })

  it("treats an unterminated frontmatter block as all body", () => {
    const parsed = parseNoteFile("---\ntitle: Broken\nstill going")
    expect(parsed.frontmatter).toEqual({})
    expect(parsed.body).toContain("title: Broken")
  })

  it("normalises CRLF line endings", () => {
    const parsed = parseNoteFile("---\r\ntitle: Windows\r\n---\r\n\r\nBody\r\n")
    expect(parsed.frontmatter.title).toBe("Windows")
    expect(parsed.body).toBe("Body")
  })

  it("parses an empty tag list as an empty array", () => {
    expect(parseNoteFile(composeNoteFile(base, "x")).frontmatter.tags).toEqual([])
  })

  it("ignores unrecognised keys rather than failing", () => {
    const parsed = parseNoteFile("---\ntitle: Kept\nmystery_key: ignored\n---\n\nBody")
    expect(parsed.frontmatter.title).toBe("Kept")
    expect(parsed.body).toBe("Body")
  })

  it("preserves a body that itself contains a horizontal rule", () => {
    const parsed = parseNoteFile(composeNoteFile(base, "before\n\n---\n\nafter"))
    expect(parsed.body).toBe("before\n\n---\n\nafter")
  })
})

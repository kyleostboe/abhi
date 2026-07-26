import { describe, expect, it } from "vitest"
import {
  deriveTitle,
  derivePreview,
  extensionOf,
  isImageFilename,
  parseBlockLine,
  parseQuoteAt,
  sanitizeFilename,
  serializeBlock,
  slugify,
  stripMarkdown,
  type InlineBlock,
} from "./journal-markdown"

describe("extensionOf / isImageFilename", () => {
  it("lowercases the extension and ignores surrounding whitespace", () => {
    expect(extensionOf("  Photo.JPG  ")).toBe("jpg")
  })

  it("returns an empty string when there is no extension", () => {
    expect(extensionOf("no-extension")).toBe("")
  })

  it("treats known image extensions as images and audio as not", () => {
    expect(isImageFilename("sit.png")).toBe(true)
    expect(isImageFilename("sit.HEIC")).toBe(true)
    expect(isImageFilename("voice-note.opus")).toBe(false)
  })
})

describe("slugify", () => {
  it("lowercases, collapses punctuation to single hyphens and trims them", () => {
    expect(slugify("  Retreat: Day 3 — Morning!  ")).toBe("retreat-day-3-morning")
  })

  it("falls back to 'note' when nothing survives normalisation", () => {
    expect(slugify("!!!")).toBe("note")
  })

  it("caps the base at 60 characters", () => {
    expect(slugify("a".repeat(200))).toHaveLength(60)
  })

  it("appends at most 8 characters of the unique suffix", () => {
    expect(slugify("note", "0123456789abcdef")).toBe("note-01234567")
  })
})

describe("sanitizeFilename", () => {
  it("replaces path and link-breaking characters with single hyphens", () => {
    expect(sanitizeFilename('my/photo:v2*[final].png')).toBe("my-photo-v2-final-.png")
  })

  it("collapses whitespace runs into one hyphen", () => {
    expect(sanitizeFilename("a   b.png")).toBe("a-b.png")
  })

  it("falls back to 'file' for an empty name", () => {
    expect(sanitizeFilename("   ")).toBe("file")
  })
})

describe("serializeBlock / parseBlockLine round-trip", () => {
  it("round-trips an image embed", () => {
    const block: InlineBlock = { type: "image", filename: "sunrise.png" }
    expect(serializeBlock(block)).toBe("![[attachments/sunrise.png]]")
    expect(parseBlockLine(serializeBlock(block))).toEqual(block)
  })

  it("classifies a non-image embed as audio on the way back", () => {
    const block: InlineBlock = { type: "audio", filename: "note.opus" }
    expect(parseBlockLine(serializeBlock(block))).toEqual(block)
  })

  it("round-trips a meditation reference", () => {
    const block: InlineBlock = { type: "meditation", slug: "body-scan" }
    expect(serializeBlock(block)).toBe("[[Meditations/body-scan]]")
    expect(parseBlockLine(serializeBlock(block))).toEqual(block)
  })

  it("returns null for ordinary markdown", () => {
    expect(parseBlockLine("just a sentence")).toBeNull()
    expect(parseBlockLine("# a heading")).toBeNull()
  })
})

describe("parseQuoteAt", () => {
  it("collects a multi-line quote and its attribution", () => {
    const lines = ["> first", "> second", "> — [[day-one]]", "after"]
    const result = parseQuoteAt(lines, 0)
    expect(result).not.toBeNull()
    expect(result!.block).toEqual({ type: "quote", text: "first\nsecond", noteSlug: "day-one" })
    // Consumes through the attribution line, leaving the following line untouched.
    expect(result!.next).toBe(3)
  })

  it("handles a quote with no attribution", () => {
    const result = parseQuoteAt(["> alone", "next"], 0)
    expect(result!.block).toEqual({ type: "quote", text: "alone", noteSlug: null })
    expect(result!.next).toBe(1)
  })

  it("returns null when the line is not a quote", () => {
    expect(parseQuoteAt(["plain"], 0)).toBeNull()
  })

  it("survives a serialized quote block", () => {
    const block: InlineBlock = { type: "quote", text: "be here\nnow", noteSlug: "sit-12" }
    const result = parseQuoteAt(serializeBlock(block).split("\n"), 0)
    expect(result!.block).toEqual(block)
  })
})

describe("stripMarkdown", () => {
  it("removes attachment embeds entirely but keeps meditation link text", () => {
    expect(stripMarkdown("![[attachments/a.png]] after")).toBe("after")
    expect(stripMarkdown("[[Meditations/body-scan]]")).toBe("body-scan")
    expect(stripMarkdown("[[plain-link]]")).toBe("plain-link")
  })

  it("strips headings, list markers, checkboxes and quotes", () => {
    expect(stripMarkdown("### Heading")).toBe("Heading")
    expect(stripMarkdown("- [x] done thing")).toBe("done thing")
    expect(stripMarkdown("> quoted")).toBe("quoted")
  })

  it("unwraps emphasis and inline code", () => {
    expect(stripMarkdown("**bold** and _italic_ and `code`")).toBe("bold and italic and code")
  })
})

describe("deriveTitle / derivePreview", () => {
  it("uses the first non-empty stripped line as the title", () => {
    expect(deriveTitle("\n\n# Morning sit\n\nrest of it")).toBe("Morning sit")
  })

  it("falls back to 'New note' for an empty document", () => {
    expect(deriveTitle("   \n\n")).toBe("New note")
  })

  it("caps the title at 120 characters", () => {
    expect(deriveTitle("x".repeat(200))).toHaveLength(120)
  })

  it("previews from the second meaningful line onward", () => {
    expect(derivePreview("# Title\n\nfirst body line\nsecond body line")).toBe("first body line second body line")
  })

  it("returns an empty preview when there is only a title", () => {
    expect(derivePreview("# Only a title")).toBe("")
  })

  it("caps the preview at 160 characters", () => {
    expect(derivePreview(`title\n${"y".repeat(400)}`)).toHaveLength(160)
  })
})

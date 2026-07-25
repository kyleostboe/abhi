/**
 * The markdown contract for journal notes.
 *
 * Notes are stored as markdown, not editor JSON, so that a future export is a file copy rather
 * than a serializer we would have to keep in sync forever. Every block the editor can produce
 * has a representation here, and each one is deliberately *already valid Obsidian syntax* — an
 * exported vault needs no conversion step at all:
 *
 *   image             ![[attachments/<filename>]]
 *   voice note        ![[attachments/<filename>.opus]]
 *   meditation ref    [[Meditations/<meditation-slug>]]
 *   quote from note   > <quoted text>
 *                     > — [[<note-slug>]]
 *
 * The app parses those same patterns back into rich inline cards. Nothing else in the codebase
 * should invent additional syntax: if a block cannot round-trip through here, it must not ship.
 *
 * Plain TypeScript — no React, no DOM — so it can be unit-tested and reused by an exporter.
 */

export type InlineBlock =
  | { type: "image"; filename: string }
  | { type: "audio"; filename: string }
  | { type: "meditation"; slug: string }
  | { type: "quote"; text: string; noteSlug: string | null }

export const ATTACHMENT_DIR = "attachments"
export const MEDITATION_DIR = "Meditations"

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "heic"])

export const extensionOf = (filename: string): string => {
  const match = /\.([a-z0-9]+)$/i.exec(filename.trim())
  return match ? match[1].toLowerCase() : ""
}

export const isImageFilename = (filename: string): boolean => IMAGE_EXTENSIONS.has(extensionOf(filename))

/**
 * Stable, human-readable identifier. Generated once when a note or meditation is created and
 * never regenerated on rename — links written today have to keep resolving.
 */
export const slugify = (input: string, uniqueSuffix?: string): string => {
  const base =
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "note"
  return uniqueSuffix ? `${base}-${uniqueSuffix.slice(0, 8)}` : base
}

/** Filenames land in markdown links, so they must not contain characters that break them. */
export const sanitizeFilename = (filename: string): string =>
  filename
    .trim()
    .replace(/[\\/:*?"<>|[\]]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120) || "file"

// ------------------------------------------------------------------------------------------
// Serialization — one block to one markdown line
// ------------------------------------------------------------------------------------------

export const serializeBlock = (block: InlineBlock): string => {
  switch (block.type) {
    case "image":
    case "audio":
      return `![[${ATTACHMENT_DIR}/${block.filename}]]`
    case "meditation":
      return `[[${MEDITATION_DIR}/${block.slug}]]`
    case "quote": {
      const quoted = block.text
        .split("\n")
        .map((line) => `> ${line}`.trimEnd())
        .join("\n")
      return block.noteSlug ? `${quoted}\n> — [[${block.noteSlug}]]` : quoted
    }
  }
}

// ------------------------------------------------------------------------------------------
// Parsing — recognise our own blocks when reading markdown back
// ------------------------------------------------------------------------------------------

const EMBED_RE = new RegExp(`^!\\[\\[${ATTACHMENT_DIR}/([^\\]]+)\\]\\]$`)
const MEDITATION_RE = new RegExp(`^\\[\\[${MEDITATION_DIR}/([^\\]]+)\\]\\]$`)
const QUOTE_ATTRIBUTION_RE = /^>\s*—\s*\[\[([^\]]+)\]\]\s*$/

/** Parses a single trimmed line into a block, or null when it is ordinary markdown. */
export const parseBlockLine = (line: string): InlineBlock | null => {
  const trimmed = line.trim()

  const embed = EMBED_RE.exec(trimmed)
  if (embed) {
    const filename = embed[1].trim()
    return { type: isImageFilename(filename) ? "image" : "audio", filename }
  }

  const meditation = MEDITATION_RE.exec(trimmed)
  if (meditation) {
    return { type: "meditation", slug: meditation[1].trim() }
  }

  return null
}

/**
 * Pulls a blockquote (one or more `>` lines, optionally ending in a `— [[slug]]` attribution)
 * out of `lines` starting at `index`. Returns the block and the index just past it.
 */
export const parseQuoteAt = (lines: string[], index: number): { block: InlineBlock; next: number } | null => {
  if (!lines[index]?.trim().startsWith(">")) return null

  const collected: string[] = []
  let noteSlug: string | null = null
  let cursor = index

  while (cursor < lines.length && lines[cursor].trim().startsWith(">")) {
    const line = lines[cursor]
    const attribution = QUOTE_ATTRIBUTION_RE.exec(line.trim())
    if (attribution) {
      noteSlug = attribution[1].trim()
      cursor++
      break
    }
    collected.push(line.trim().replace(/^>\s?/, ""))
    cursor++
  }

  return { block: { type: "quote", text: collected.join("\n").trim(), noteSlug }, next: cursor }
}

// ------------------------------------------------------------------------------------------
// Title / preview derivation
// ------------------------------------------------------------------------------------------

/** Strips markdown decoration so a line can be shown as a plain title or list preview. */
export const stripMarkdown = (markdown: string): string =>
  markdown
    .replace(new RegExp(`!\\[\\[${ATTACHMENT_DIR}/[^\\]]+\\]\\]`, "g"), " ")
    .replace(new RegExp(`\\[\\[${MEDITATION_DIR}/([^\\]]+)\\]\\]`, "g"), "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim()

/** Notes derives a title from the first non-empty line rather than storing one separately. */
export const deriveTitle = (markdown: string): string => {
  for (const line of markdown.split("\n")) {
    const text = stripMarkdown(line)
    if (text) return text.slice(0, 120)
  }
  return "New note"
}

/** Second line onward, for the two-line preview in the note list. */
export const derivePreview = (markdown: string): string => {
  const lines = markdown.split("\n")
  let seenTitle = false
  const rest: string[] = []
  for (const line of lines) {
    const text = stripMarkdown(line)
    if (!text) continue
    if (!seenTitle) {
      seenTitle = true
      continue
    }
    rest.push(text)
    if (rest.join(" ").length > 160) break
  }
  return rest.join(" ").slice(0, 160)
}

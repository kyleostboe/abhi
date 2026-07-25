/**
 * YAML frontmatter for note files.
 *
 * Every note stored in R2 is a self-describing markdown file: frontmatter block, then the body.
 * That is deliberate — it means the database index is *derivable* rather than authoritative. If
 * the index is ever lost, or the app moves off Postgres entirely, the whole journal can be
 * rebuilt by listing the bucket and parsing these headers. It also means an exported vault needs
 * no post-processing: this is already the shape Obsidian expects.
 *
 * Only the small, fixed set of scalar/list values below is supported. This is not a general YAML
 * implementation and does not need to be — anything richer belongs in the note body.
 */

export type NoteFrontmatter = {
  title: string
  slug: string
  /** When the sit happened (or when a standalone note was written). */
  date: string
  updated: string
  folder?: string | null
  meditation?: string | null
  meditationSlug?: string | null
  practiceType?: string | null
  tags?: string[]
  font?: string | null
  visibility?: string
}

/**
 * Quotes only when YAML actually requires it, so a vault file stays pleasant to read in a plain
 * text editor — `slug: retreat-day-3` rather than `slug: "retreat-day-3"`.
 */
const yamlScalar = (value: string): string => {
  const needsQuotes =
    value === "" ||
    /^\s|\s$/.test(value) || // leading/trailing whitespace is not preserved unquoted
    /[:#]\s|^[-?:,[\]{}#&*!|>'"%@`]/.test(value) || // YAML indicators, only where they matter
    /[\n"]/.test(value) ||
    value.endsWith(":")
  return needsQuotes ? `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"` : value
}

const unquote = (value: string): string => {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 1) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length > 1)
  ) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\")
  }
  return trimmed
}

/** Builds the complete file contents: `---` block followed by the markdown body. */
export const composeNoteFile = (frontmatter: NoteFrontmatter, body: string): string => {
  const lines: string[] = ["---"]

  lines.push(`title: ${yamlScalar(frontmatter.title)}`)
  lines.push(`slug: ${yamlScalar(frontmatter.slug)}`)
  lines.push(`date: ${yamlScalar(frontmatter.date)}`)
  lines.push(`updated: ${yamlScalar(frontmatter.updated)}`)

  if (frontmatter.folder) lines.push(`folder: ${yamlScalar(frontmatter.folder)}`)
  if (frontmatter.meditation) lines.push(`meditation: ${yamlScalar(frontmatter.meditation)}`)
  if (frontmatter.meditationSlug) lines.push(`meditation_slug: ${yamlScalar(frontmatter.meditationSlug)}`)
  if (frontmatter.practiceType) lines.push(`practice_type: ${yamlScalar(frontmatter.practiceType)}`)
  if (frontmatter.font) lines.push(`font: ${yamlScalar(frontmatter.font)}`)
  lines.push(`visibility: ${yamlScalar(frontmatter.visibility ?? "private")}`)

  const tags = frontmatter.tags ?? []
  lines.push(tags.length > 0 ? `tags: [${tags.map(yamlScalar).join(", ")}]` : "tags: []")

  lines.push("---", "")
  return `${lines.join("\n")}\n${body.trimStart()}`.trimEnd() + "\n"
}

/** Splits a stored file back into its frontmatter and body. */
export const parseNoteFile = (contents: string): { frontmatter: Partial<NoteFrontmatter>; body: string } => {
  const normalized = (contents ?? "").replace(/\r\n/g, "\n")

  if (!normalized.startsWith("---\n")) {
    // A file without frontmatter is still a perfectly good note; treat it all as body.
    return { frontmatter: {}, body: normalized.trim() }
  }

  const end = normalized.indexOf("\n---", 3)
  if (end === -1) {
    return { frontmatter: {}, body: normalized.trim() }
  }

  const block = normalized.slice(4, end)
  const body = normalized.slice(end + 4).replace(/^\n+/, "")

  const frontmatter: Partial<NoteFrontmatter> = {}
  for (const line of block.split("\n")) {
    const separator = line.indexOf(":")
    if (separator === -1) continue
    const key = line.slice(0, separator).trim()
    const rawValue = line.slice(separator + 1).trim()

    switch (key) {
      case "title":
        frontmatter.title = unquote(rawValue)
        break
      case "slug":
        frontmatter.slug = unquote(rawValue)
        break
      case "date":
        frontmatter.date = unquote(rawValue)
        break
      case "updated":
        frontmatter.updated = unquote(rawValue)
        break
      case "folder":
        frontmatter.folder = unquote(rawValue)
        break
      case "meditation":
        frontmatter.meditation = unquote(rawValue)
        break
      case "meditation_slug":
        frontmatter.meditationSlug = unquote(rawValue)
        break
      case "practice_type":
        frontmatter.practiceType = unquote(rawValue)
        break
      case "font":
        frontmatter.font = unquote(rawValue)
        break
      case "visibility":
        frontmatter.visibility = unquote(rawValue)
        break
      case "tags": {
        const inner = rawValue.replace(/^\[/, "").replace(/\]$/, "").trim()
        frontmatter.tags = inner
          ? inner
              .split(",")
              .map((tag) => unquote(tag))
              .filter(Boolean)
          : []
        break
      }
      default:
        break
    }
  }

  return { frontmatter, body: body.trim() }
}

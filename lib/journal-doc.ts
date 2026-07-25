/**
 * Converts between the editor's document JSON and the markdown we actually store.
 *
 * Markdown is the source of truth (see lib/journal-markdown.ts for the block contract); this
 * module is only the bridge the editor needs. It is deliberately hand-written rather than
 * delegated to a generic markdown package: the grammar is small, and the custom blocks
 * (attachments, meditation references, note quotes) need exact control over their syntax so an
 * exported vault is valid Obsidian without a conversion pass.
 *
 * Plain data in, plain data out — no React, no DOM.
 */

import {
  ATTACHMENT_DIR,
  MEDITATION_DIR,
  isImageFilename,
  parseBlockLine,
  parseQuoteAt,
} from "@/lib/journal-markdown"

export type DocMark = { type: "bold" | "italic" | "code" }
export type DocText = { type: "text"; text: string; marks?: DocMark[] }
export type DocNode = {
  type: string
  attrs?: Record<string, unknown>
  content?: DocNode[]
  text?: string
  marks?: DocMark[]
}

// ------------------------------------------------------------------------------------------
// Inline text: **bold**, *italic*, `code`
// ------------------------------------------------------------------------------------------

const INLINE_RE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g

const parseInline = (text: string): DocNode[] => {
  if (!text) return []
  const nodes: DocNode[] = []
  let lastIndex = 0

  for (const match of text.matchAll(INLINE_RE)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      nodes.push({ type: "text", text: text.slice(lastIndex, index) })
    }
    const token = match[0]
    if (token.startsWith("**")) {
      nodes.push({ type: "text", text: token.slice(2, -2), marks: [{ type: "bold" }] })
    } else if (token.startsWith("`")) {
      nodes.push({ type: "text", text: token.slice(1, -1), marks: [{ type: "code" }] })
    } else {
      nodes.push({ type: "text", text: token.slice(1, -1), marks: [{ type: "italic" }] })
    }
    lastIndex = index + token.length
  }

  if (lastIndex < text.length) {
    nodes.push({ type: "text", text: text.slice(lastIndex) })
  }
  return nodes
}

const serializeInline = (nodes: DocNode[] | undefined): string => {
  if (!nodes) return ""
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "\n"
      const text = node.text ?? ""
      if (!text) return ""
      const marks = new Set((node.marks ?? []).map((mark) => mark.type))
      let out = text
      if (marks.has("code")) out = `\`${out}\``
      if (marks.has("italic")) out = `*${out}*`
      if (marks.has("bold")) out = `**${out}**`
      return out
    })
    .join("")
}

// ------------------------------------------------------------------------------------------
// markdown -> document
// ------------------------------------------------------------------------------------------

const paragraph = (text: string): DocNode => ({
  type: "paragraph",
  ...(text ? { content: parseInline(text) } : {}),
})

export const markdownToDoc = (markdown: string): DocNode => {
  const lines = (markdown ?? "").replace(/\r\n/g, "\n").split("\n")
  const content: DocNode[] = []
  let index = 0

  while (index < lines.length) {
    const raw = lines[index]
    const line = raw.trim()

    if (!line) {
      index++
      continue
    }

    // Custom blocks first — they own their exact syntax.
    const block = parseBlockLine(line)
    if (block) {
      if (block.type === "image" || block.type === "audio") {
        content.push({ type: "attachment", attrs: { filename: block.filename, kind: block.type } })
      } else if (block.type === "meditation") {
        content.push({ type: "meditationRef", attrs: { slug: block.slug } })
      }
      index++
      continue
    }

    if (line.startsWith(">")) {
      const quote = parseQuoteAt(lines, index)
      if (quote && quote.block.type === "quote") {
        content.push({
          type: "noteQuote",
          attrs: { text: quote.block.text, noteSlug: quote.block.noteSlug },
        })
        index = quote.next
        continue
      }
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      content.push({
        type: "heading",
        attrs: { level: heading[1].length },
        content: parseInline(heading[2]),
      })
      index++
      continue
    }

    // Consecutive checklist lines collapse into one taskList.
    if (/^[-*+]\s+\[[ xX]\]\s?/.test(line)) {
      const items: DocNode[] = []
      while (index < lines.length && /^[-*+]\s+\[[ xX]\]\s?/.test(lines[index].trim())) {
        const item = /^[-*+]\s+\[([ xX])\]\s?(.*)$/.exec(lines[index].trim())
        items.push({
          type: "taskItem",
          attrs: { checked: (item?.[1] ?? " ").toLowerCase() === "x" },
          content: [paragraph(item?.[2] ?? "")],
        })
        index++
      }
      content.push({ type: "taskList", content: items })
      continue
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: DocNode[] = []
      while (
        index < lines.length &&
        /^[-*+]\s+/.test(lines[index].trim()) &&
        !/^[-*+]\s+\[[ xX]\]\s?/.test(lines[index].trim())
      ) {
        items.push({
          type: "listItem",
          content: [paragraph(lines[index].trim().replace(/^[-*+]\s+/, ""))],
        })
        index++
      }
      content.push({ type: "bulletList", content: items })
      continue
    }

    content.push(paragraph(line))
    index++
  }

  return { type: "doc", content: content.length > 0 ? content : [paragraph("")] }
}

// ------------------------------------------------------------------------------------------
// document -> markdown
// ------------------------------------------------------------------------------------------

const nodeToMarkdown = (node: DocNode): string => {
  switch (node.type) {
    case "paragraph":
      return serializeInline(node.content)

    case "heading": {
      const level = Math.min(3, Math.max(1, Number(node.attrs?.level ?? 1)))
      return `${"#".repeat(level)} ${serializeInline(node.content)}`
    }

    case "bulletList":
      return (node.content ?? [])
        .map((item) => `- ${(item.content ?? []).map(nodeToMarkdown).join(" ").trim()}`)
        .join("\n")

    case "taskList":
      return (node.content ?? [])
        .map((item) => {
          const mark = item.attrs?.checked ? "x" : " "
          return `- [${mark}] ${(item.content ?? []).map(nodeToMarkdown).join(" ").trim()}`
        })
        .join("\n")

    case "attachment":
      return `![[${ATTACHMENT_DIR}/${String(node.attrs?.filename ?? "")}]]`

    case "meditationRef":
      return `[[${MEDITATION_DIR}/${String(node.attrs?.slug ?? "")}]]`

    case "noteQuote": {
      const text = String(node.attrs?.text ?? "")
      const slug = node.attrs?.noteSlug ? String(node.attrs.noteSlug) : null
      const quoted = text
        .split("\n")
        .map((line) => `> ${line}`.trimEnd())
        .join("\n")
      return slug ? `${quoted}\n> — [[${slug}]]` : quoted
    }

    case "blockquote":
      return (node.content ?? [])
        .map((child) => `> ${nodeToMarkdown(child)}`.trimEnd())
        .join("\n")

    default:
      return serializeInline(node.content)
  }
}

export const docToMarkdown = (doc: DocNode | null | undefined): string => {
  if (!doc?.content) return ""
  return doc.content
    .map(nodeToMarkdown)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** True when the filename should render as an image rather than an audio player. */
export const attachmentIsImage = (filename: string) => isImageFilename(filename)

"use client"

/**
 * The three custom block types a note can contain, as Tiptap nodes.
 *
 * Each one is an atom (not text-editable) that renders as an inline card in the document flow,
 * exactly where it sits in the markdown. Their markdown form is defined once in
 * lib/journal-markdown.ts and produced by lib/journal-doc.ts — these declarations only describe
 * the editor-side shape, so the two can never drift into separate syntaxes.
 */

import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"

import { AttachmentNodeView, MeditationRefNodeView, NoteQuoteNodeView } from "@/components/journal/note-block-views"

/** `![[attachments/<filename>]]` — an image or a voice note. */
export const AttachmentNode = Node.create({
  name: "attachment",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      filename: { default: "" },
      kind: { default: "image" },
    }
  },

  parseHTML() {
    return [{ tag: "div[data-journal-attachment]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-journal-attachment": "" })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentNodeView)
  },
})

/** `[[Meditations/<slug>]]` — a reference to something in the user's library. */
export const MeditationRefNode = Node.create({
  name: "meditationRef",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      slug: { default: "" },
      title: { default: "" },
      meditationId: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: "div[data-journal-meditation]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-journal-meditation": "" })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MeditationRefNodeView)
  },
})

/** A quoted passage lifted from another note: `> text` plus a `> — [[slug]]` attribution. */
export const NoteQuoteNode = Node.create({
  name: "noteQuote",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      text: { default: "" },
      noteSlug: { default: null },
      noteTitle: { default: "" },
    }
  },

  parseHTML() {
    return [{ tag: "div[data-journal-quote]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-journal-quote": "" })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(NoteQuoteNodeView)
  },
})

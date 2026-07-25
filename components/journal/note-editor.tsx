"use client"

/**
 * The writing surface. Deliberately not a form: no bordered input, no Save button — text sits
 * directly on the page and autosaves, the way a notes app behaves.
 *
 * Markdown is the stored format. The editor converts to a document on load and back to markdown
 * on every change (lib/journal-doc.ts), so what is persisted is always plain markdown that a
 * future export can copy verbatim.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { EditorContent, useEditor, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { TaskList } from "@tiptap/extension-task-list"
import { TaskItem } from "@tiptap/extension-task-item"

import { AttachmentNode, MeditationRefNode, NoteQuoteNode } from "@/components/journal/note-blocks"
import { docToMarkdown, markdownToDoc, type DocNode } from "@/lib/journal-doc"
import { cn } from "@/lib/utils"

export const NOTE_FONTS = [
  { id: "serif", label: "Serif", className: "font-serif" },
  { id: "sans", label: "Sans", className: "font-sans" },
  { id: "mono", label: "Mono", className: "font-mono" },
] as const

export type NoteFontId = (typeof NOTE_FONTS)[number]["id"]

/** NULL font means "use the app's typeface", which is the serif the rest of the app uses. */
export const fontClassFor = (font: string | null | undefined): string =>
  NOTE_FONTS.find((option) => option.id === font)?.className ?? "font-serif"

const AUTOSAVE_DELAY_MS = 900

export type NoteEditorHandle = {
  insertAttachment: (filename: string, kind: "image" | "audio") => void
  insertMeditation: (params: { slug: string; title: string; meditationId: string | null }) => void
  insertQuote: (params: { text: string; noteSlug: string | null; noteTitle: string }) => void
  focus: () => void
  getEditor: () => Editor | null
}

export function NoteEditor({
  noteId,
  initialMarkdown,
  font,
  onSave,
  onReady,
  className,
}: {
  noteId: string
  initialMarkdown: string
  font: string | null
  onSave: (markdown: string) => Promise<boolean>
  onReady?: (handle: NoteEditorHandle) => void
  className?: string
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestMarkdown = useRef(initialMarkdown)
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  const flush = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    setStatus("saving")
    const ok = await onSaveRef.current(latestMarkdown.current)
    setStatus(ok ? "saved" : "error")
  }, [])

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void flush()
    }, AUTOSAVE_DELAY_MS)
  }, [flush])

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Our own quote block owns the `>` syntax, so the built-in blockquote stays off — one
        // markdown representation per concept, or the round-trip stops being deterministic.
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      TaskList,
      TaskItem.configure({ nested: false }),
      Placeholder.configure({ placeholder: "Start writing…" }),
      AttachmentNode,
      MeditationRefNode,
      NoteQuoteNode,
    ],
    [],
  )

  const editor = useEditor(
    {
      extensions,
      content: markdownToDoc(initialMarkdown) as never,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "outline-none min-h-[40vh] max-w-[68ch]",
        },
      },
      onUpdate: ({ editor: instance }) => {
        latestMarkdown.current = docToMarkdown(instance.getJSON() as DocNode)
        setStatus("idle")
        scheduleSave()
      },
      onBlur: () => {
        if (latestMarkdown.current !== initialMarkdown) void flush()
      },
    },
    [noteId],
  )

  // Switching notes swaps the document without dragging the previous note's pending save along.
  // Deliberately keyed on noteId alone: a successful save feeds the new markdown straight back
  // in as `initialMarkdown`, and reacting to that would reset the status indicator the instant
  // it said "Saved".
  useEffect(() => {
    latestMarkdown.current = initialMarkdown
    setStatus("idle")
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId])

  useEffect(() => {
    if (!editor || !onReady) return
    const insertBlock = (type: string, attrs: Record<string, unknown>) => {
      editor.chain().focus().insertContent({ type, attrs }).createParagraphNear().run()
      latestMarkdown.current = docToMarkdown(editor.getJSON() as DocNode)
      scheduleSave()
    }
    onReady({
      insertAttachment: (filename, kind) => insertBlock("attachment", { filename, kind }),
      insertMeditation: ({ slug, title, meditationId }) => insertBlock("meditationRef", { slug, title, meditationId }),
      insertQuote: ({ text, noteSlug, noteTitle }) => insertBlock("noteQuote", { text, noteSlug, noteTitle }),
      focus: () => editor.chain().focus().run(),
      getEditor: () => editor,
    })
  }, [editor, onReady, scheduleSave])

  return (
    <div className={cn("flex flex-col", className)}>
      <EditorContent
        editor={editor}
        className={cn(
          "journal-prose text-[17px] leading-[1.7] text-gray-700",
          fontClassFor(font),
        )}
      />
      <div className="mt-4 h-4 text-[11px] font-black tracking-tight text-gray-400" aria-live="polite">
        {status === "saving" && "Saving…"}
        {status === "saved" && "Saved"}
        {status === "error" && <span className="text-destructive">Couldn&apos;t save</span>}
      </div>
    </div>
  )
}

export type { Editor }

"use client"

/**
 * How the custom blocks look inside a note. Each renders as a card sitting in the document
 * flow — the same position it occupies in the markdown — rather than in a separate attachment
 * tray, so a note reads like a page with things embedded in it.
 */

import { useEffect, useState } from "react"
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import { BookOpen, ImageOff, Play, Quote } from "lucide-react"

import { fetchAttachmentUrls } from "@/lib/journal-attachments"
import { attachmentIsImage } from "@/lib/journal-doc"
import { useJournalRefs } from "@/components/journal/journal-refs"
import { cn } from "@/lib/utils"

/**
 * Attachment URLs are short-lived and signed, so they're resolved at render time and cached
 * per filename for the life of the page rather than stored in the note.
 */
const urlCache = new Map<string, string>()
const pending = new Map<string, Promise<Record<string, string>>>()

const resolveAttachmentUrl = async (filename: string): Promise<string | null> => {
  if (urlCache.has(filename)) return urlCache.get(filename) ?? null

  let request = pending.get(filename)
  if (!request) {
    request = fetchAttachmentUrls([filename])
    pending.set(filename, request)
  }

  try {
    const urls = await request
    const url = urls[filename]
    if (url) urlCache.set(filename, url)
    return url ?? null
  } finally {
    pending.delete(filename)
  }
}

export function AttachmentNodeView({ node, selected }: NodeViewProps) {
  const filename = String(node.attrs.filename ?? "")
  const isImage = attachmentIsImage(filename)
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    if (!filename) return
    resolveAttachmentUrl(filename)
      .then((resolved) => {
        if (!active) return
        if (resolved) setUrl(resolved)
        else setFailed(true)
      })
      .catch(() => active && setFailed(true))
    return () => {
      active = false
    }
  }, [filename])

  return (
    <NodeViewWrapper
      className={cn(
        "my-4 overflow-hidden rounded-xl border-[3px] transition-colors",
        selected ? "border-stone-400" : "border-muted",
      )}
    >
      {isImage ? (
        failed || !url ? (
          <div className="flex items-center gap-2 bg-muted/50 p-4 text-xs font-black text-gray-500">
            <ImageOff className="h-4 w-4" />
            {failed ? "Image unavailable" : "Loading image…"}
          </div>
        ) : (
          <a href={url} target="_blank" rel="noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={filename} className="block max-h-[420px] w-full object-cover" />
          </a>
        )
      ) : (
        <div className="bg-gradient-to-br from-white to-stone-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-gray-400">
            <Play className="h-3 w-3" />
            Voice note
          </div>
          {url ? (
            <audio controls src={url} className="w-full" preload="none" />
          ) : (
            <div className="text-xs font-black text-gray-500">{failed ? "Audio unavailable" : "Loading audio…"}</div>
          )}
        </div>
      )}
    </NodeViewWrapper>
  )
}

export function MeditationRefNodeView({ node, selected }: NodeViewProps) {
  const { meditationTitleBySlug, meditationIdBySlug } = useJournalRefs()
  const slug = String(node.attrs.slug ?? "")
  // A note loaded from markdown only carries the slug, so the title is resolved from the
  // library here rather than baked into the note body where it would go stale.
  const title = String(node.attrs.title ?? "") || meditationTitleBySlug[slug] || slug
  const meditationId = node.attrs.meditationId ? String(node.attrs.meditationId) : (meditationIdBySlug[slug] ?? null)

  return (
    <NodeViewWrapper
      className={cn(
        "my-4 rounded-xl border-[3px] bg-gradient-to-br from-white to-stone-50 p-4 transition-colors",
        selected ? "border-stone-400" : "border-muted",
      )}
    >
      <div className="flex items-center gap-3">
        <BookOpen className="h-5 w-5 flex-shrink-0 text-logo-emerald-400" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">Meditation</div>
          <div className="truncate font-serif text-sm font-black text-gray-700">{title}</div>
        </div>
        {meditationId && (
          <a
            href={`/library?meditation=${meditationId}`}
            className="flex-shrink-0 text-xs font-black text-gray-500 underline underline-offset-2 hover:text-gray-700"
          >
            Open
          </a>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export function NoteQuoteNodeView({ node, selected }: NodeViewProps) {
  const { noteTitleBySlug } = useJournalRefs()
  const text = String(node.attrs.text ?? "")
  const slug = String(node.attrs.noteSlug ?? "")
  const noteTitle = String(node.attrs.noteTitle ?? "") || noteTitleBySlug[slug] || slug

  return (
    <NodeViewWrapper
      className={cn(
        "my-4 rounded-xl border-l-[5px] border-[3px] border-l-logo-rose-300 bg-muted/40 p-4 transition-colors",
        selected ? "border-stone-400 border-l-logo-rose-300" : "border-muted border-l-logo-rose-300",
      )}
    >
      <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
        <Quote className="h-3 w-3" />
        From another note
      </div>
      <div className="whitespace-pre-wrap font-serif text-sm text-gray-600">{text}</div>
      {noteTitle && <div className="mt-2 truncate text-xs font-black text-gray-500">— {noteTitle}</div>}
    </NodeViewWrapper>
  )
}

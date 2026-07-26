"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { deleteAttachmentsForNote } from "@/lib/journal-attachments"
import { deriveTitle, derivePreview, slugify } from "@/lib/journal-markdown"
import { log } from "@/lib/log"

export type JournalNote = {
  id: string
  slug: string
  title: string
  preview: string
  /** Markdown body. Empty until loaded from storage when `isBodyLoaded` is false. */
  contentMd: string
  noteKey: string | null
  isBodyLoaded: boolean
  folderId: string | null
  meditationId: string | null
  meditationTitle: string | null
  practiceType: string | null
  tags: string[]
  font: string | null
  playedAt: string
  updatedAt: string
}

export type JournalFolder = {
  id: string
  name: string
  sortOrder: number
}

type NoteRow = {
  id: string
  slug: string | null
  title: string | null
  preview: string | null
  content_md: string | null
  note: string | null
  note_key: string | null
  folder_id: string | null
  meditation_id: string | null
  meditation_title: string | null
  practice_type: string | null
  tags: string[] | null
  font: string | null
  played_at: string
  updated_at: string | null
}

// The list only needs the index. A note's markdown body lives in R2 and is fetched when the
// note is actually opened, so loading the journal never pulls every note's full text.
const NOTE_COLUMNS =
  "id, slug, title, preview, content_md, note, note_key, folder_id, meditation_id, meditation_title, practice_type, tags, font, played_at, updated_at"

const mapNote = (row: NoteRow): JournalNote => {
  // `content_md` is the markdown body; `note` is the pre-notes plain-text column, which is
  // already valid markdown, so older rows need no conversion.
  const contentMd = row.content_md ?? row.note ?? ""
  // Entries created by playing a meditation start with no body at all, so fall back to the
  // meditation's name rather than labelling every one of them "New note".
  const derivedTitle = contentMd.trim() ? deriveTitle(contentMd) : (row.meditation_title?.trim() || "New note")
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    title: row.title?.trim() || derivedTitle,
    preview: row.preview?.trim() || derivePreview(contentMd),
    contentMd,
    noteKey: row.note_key,
    /** True once the body has been read from storage (or is known to live in the column). */
    isBodyLoaded: !row.note_key,
    folderId: row.folder_id,
    meditationId: row.meditation_id,
    meditationTitle: row.meditation_title,
    practiceType: row.practice_type,
    tags: row.tags ?? [],
    font: row.font,
    playedAt: row.played_at,
    updatedAt: row.updated_at ?? row.played_at,
  }
}



export function useJournalNotes() {
  const supabase = useMemo(() => createClient(), [])
  const { isAuthenticated, userId } = useAuth()
  const [notes, setNotes] = useState<JournalNote[]>([])
  const [folders, setFolders] = useState<JournalFolder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const notesRef = useRef(notes)

  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  const reload = useCallback(async () => {
    if (!isAuthenticated) {
      setNotes([])
      setFolders([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const [noteResult, folderResult] = await Promise.all([
        supabase.from("journal_entries").select(NOTE_COLUMNS).order("updated_at", { ascending: false }),
        supabase.from("journal_folders").select("id, name, sort_order").order("sort_order", { ascending: true }),
      ])

      if (noteResult.error) {
        log.error("[journal] Failed to load notes:", noteResult.error)
      } else {
        setNotes(((noteResult.data ?? []) as NoteRow[]).map((row) => mapNote(row)))
      }

      if (folderResult.error) {
        log.error("[journal] Failed to load folders:", folderResult.error)
      } else {
        setFolders(
          ((folderResult.data ?? []) as { id: string; name: string; sort_order: number | null }[]).map((row) => ({
            id: row.id,
            name: row.name,
            sortOrder: row.sort_order ?? 0,
          })),
        )
      }
    } finally {
      setIsLoading(false)
    }
  }, [supabase, isAuthenticated])

  useEffect(() => {
    void reload()
  }, [reload, userId])

  const createNote = useCallback(
    async (params: {
      contentMd?: string
      folderId?: string | null
      meditationId?: string | null
      meditationTitle?: string | null
      practiceType?: string | null
      playedAt?: Date
    }): Promise<JournalNote | null> => {
      if (!isAuthenticated || !userId) return null

      const contentMd = params.contentMd ?? ""
      const playedAt = params.playedAt ?? new Date()
      const title = deriveTitle(contentMd)
      // Slug is generated once here and never rewritten on rename, so links keep resolving.
      const slug = slugify(title, `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`)

      const { data, error } = await supabase
        .from("journal_entries")
        .insert({
          profile_id: userId,
          content_md: contentMd,
          note: contentMd,
          title,
          slug,
          folder_id: params.folderId ?? null,
          meditation_id: params.meditationId ?? null,
          meditation_title: params.meditationTitle ?? null,
          practice_type: params.practiceType ?? null,
          played_at: playedAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(NOTE_COLUMNS)
        .single()

      if (error || !data) {
        log.error("[journal] Failed to create note:", error)
        return null
      }

      const note = mapNote(data as NoteRow)
      setNotes((previous) => [note, ...previous])
      return note
    },
    [supabase, isAuthenticated, userId],
  )

  /**
   * Fetches a note's markdown from storage the first time it's opened. The list view works off
   * the index alone, so bodies are only ever pulled for the note actually being read.
   */
  const loadNoteBody = useCallback(
    async (noteId: string): Promise<string | null> => {
      const existing = notesRef.current.find((note) => note.id === noteId)
      if (!existing) return null
      if (existing.isBodyLoaded) return existing.contentMd

      try {
        const response = await fetch(`/api/journal/note?id=${encodeURIComponent(noteId)}`)
        if (!response.ok) return null
        const { body } = (await response.json()) as { body: string }
        setNotes((previous) =>
          previous.map((note) =>
            note.id === noteId ? { ...note, contentMd: body ?? "", isBodyLoaded: true } : note,
          ),
        )
        return body ?? ""
      } catch (error) {
        log.error("[journal] Failed to load note body:", error)
        return null
      }
    },
    [],
  )

  /** Persists a note. Called by the editor's debounced autosave, so it stays optimistic. */
  const updateNote = useCallback(
    async (
      noteId: string,
      changes: {
        contentMd?: string
        folderId?: string | null
        practiceType?: string | null
        font?: string | null
        tags?: string[]
      },
    ): Promise<boolean> => {
      const existing = notesRef.current.find((note) => note.id === noteId)
      if (!existing) return false

      const contentMd = changes.contentMd ?? existing.contentMd
      const title = deriveTitle(contentMd)
      const updatedAt = new Date().toISOString()

      setNotes((previous) =>
        previous
          .map((note) =>
            note.id === noteId
              ? {
                  ...note,
                  contentMd,
                  title,
                  preview: derivePreview(contentMd),
                  folderId: changes.folderId !== undefined ? changes.folderId : note.folderId,
                  practiceType: changes.practiceType !== undefined ? changes.practiceType : note.practiceType,
                  font: changes.font !== undefined ? changes.font : note.font,
                  tags: changes.tags ?? note.tags,
                  updatedAt,
                }
              : note,
          )
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      )

      if (!isAuthenticated || !userId) return true

      // Metadata stays a direct table write; the body goes through the API route, which writes
      // the markdown file to R2 and refreshes the index in one place so the two can't drift.
      const payload: Record<string, unknown> = { updated_at: updatedAt }
      if (changes.folderId !== undefined) payload.folder_id = changes.folderId
      if (changes.practiceType !== undefined) payload.practice_type = changes.practiceType
      if (changes.font !== undefined) payload.font = changes.font
      if (changes.tags !== undefined) payload.tags = changes.tags

      if (Object.keys(payload).length > 1 || changes.contentMd === undefined) {
        const { error } = await supabase.from("journal_entries").update(payload).eq("id", noteId)
        if (error) {
          log.error("[journal] Failed to save note metadata:", error)
          return false
        }
      }

      if (changes.contentMd !== undefined) {
        try {
          const response = await fetch("/api/journal/note", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: noteId, body: contentMd }),
          })
          if (!response.ok) {
            log.error("[journal] Failed to save note body:", await response.text())
            return false
          }
          const { noteKey } = (await response.json()) as { noteKey?: string }
          if (noteKey) {
            setNotes((previous) =>
              previous.map((note) =>
                note.id === noteId ? { ...note, noteKey, isBodyLoaded: true } : note,
              ),
            )
          }
        } catch (error) {
          log.error("[journal] Failed to save note body:", error)
          return false
        }
      }

      return true
    },
    [supabase, isAuthenticated, userId],
  )

  const deleteNote = useCallback(
    async (noteId: string): Promise<boolean> => {
      const previous = notesRef.current
      setNotes((current) => current.filter((note) => note.id !== noteId))

      if (!isAuthenticated || !userId) return true

      // Reclaim the note's stored files first. The metadata rows would cascade with the note,
      // but the R2 objects would be left behind counting against the user's usage forever.
      await deleteAttachmentsForNote(noteId)
      try {
        await fetch(`/api/journal/note?id=${encodeURIComponent(noteId)}`, { method: "DELETE" })
      } catch (error) {
        log.warn("[journal] Could not delete note file:", error)
      }

      const { error } = await supabase.from("journal_entries").delete().eq("id", noteId)
      if (error) {
        log.error("[journal] Failed to delete note:", error)
        setNotes(previous)
        return false
      }
      return true
    },
    [supabase, isAuthenticated, userId],
  )

  const createFolder = useCallback(
    async (name: string): Promise<JournalFolder | null> => {
      if (!isAuthenticated || !userId) return null
      const trimmed = name.trim()
      if (!trimmed) return null

      const { data, error } = await supabase
        .from("journal_folders")
        .insert({ profile_id: userId, name: trimmed, sort_order: folders.length })
        .select("id, name, sort_order")
        .single()

      if (error || !data) {
        log.error("[journal] Failed to create folder:", error)
        return null
      }

      const folder: JournalFolder = { id: data.id, name: data.name, sortOrder: data.sort_order ?? 0 }
      setFolders((previous) => [...previous, folder])
      return folder
    },
    [supabase, isAuthenticated, userId, folders.length],
  )

  const renameFolder = useCallback(
    async (folderId: string, name: string): Promise<boolean> => {
      const trimmed = name.trim()
      if (!trimmed) return false
      setFolders((previous) => previous.map((f) => (f.id === folderId ? { ...f, name: trimmed } : f)))
      if (!isAuthenticated || !userId) return true
      const { error } = await supabase.from("journal_folders").update({ name: trimmed }).eq("id", folderId)
      if (error) {
        log.error("[journal] Failed to rename folder:", error)
        return false
      }
      return true
    },
    [supabase, isAuthenticated, userId],
  )

  /** Deleting a folder keeps its notes — they fall back to unfiled (folder_id is SET NULL). */
  const deleteFolder = useCallback(
    async (folderId: string): Promise<boolean> => {
      setFolders((previous) => previous.filter((f) => f.id !== folderId))
      setNotes((previous) => previous.map((n) => (n.folderId === folderId ? { ...n, folderId: null } : n)))
      if (!isAuthenticated || !userId) return true
      const { error } = await supabase.from("journal_folders").delete().eq("id", folderId)
      if (error) {
        log.error("[journal] Failed to delete folder:", error)
        return false
      }
      return true
    },
    [supabase, isAuthenticated, userId],
  )

  return {
    notes,
    folders,
    isLoading,
    reload,
    loadNoteBody,
    createNote,
    updateNote,
    deleteNote,
    createFolder,
    renameFolder,
    deleteFolder,
  }
}

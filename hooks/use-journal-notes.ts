"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { deriveTitle, derivePreview, slugify } from "@/lib/journal-markdown"

export type JournalNote = {
  id: string
  slug: string
  title: string
  preview: string
  contentMd: string
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
  content_md: string | null
  note: string | null
  folder_id: string | null
  meditation_id: string | null
  meditation_title: string | null
  practice_type: string | null
  tags: string[] | null
  font: string | null
  played_at: string
  updated_at: string | null
}

const NOTE_COLUMNS =
  "id, slug, title, content_md, note, folder_id, meditation_id, meditation_title, practice_type, tags, font, played_at, updated_at"

const mapNote = (row: NoteRow): JournalNote => {
  // `content_md` is the markdown body; `note` is the pre-notes plain-text column, which is
  // already valid markdown, so older rows need no conversion.
  const contentMd = row.content_md ?? row.note ?? ""
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    title: row.title?.trim() || deriveTitle(contentMd),
    preview: derivePreview(contentMd),
    contentMd,
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
        console.error("[journal] Failed to load notes:", noteResult.error)
      } else {
        setNotes(((noteResult.data ?? []) as NoteRow[]).map((row) => mapNote(row)))
      }

      if (folderResult.error) {
        console.error("[journal] Failed to load folders:", folderResult.error)
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
        console.error("[journal] Failed to create note:", error)
        return null
      }

      const note = mapNote(data as NoteRow)
      setNotes((previous) => [note, ...previous])
      return note
    },
    [supabase, isAuthenticated, userId],
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

      const payload: Record<string, unknown> = { updated_at: updatedAt }
      if (changes.contentMd !== undefined) {
        payload.content_md = contentMd
        payload.note = contentMd
        payload.title = title
      }
      if (changes.folderId !== undefined) payload.folder_id = changes.folderId
      if (changes.practiceType !== undefined) payload.practice_type = changes.practiceType
      if (changes.font !== undefined) payload.font = changes.font
      if (changes.tags !== undefined) payload.tags = changes.tags

      const { error } = await supabase.from("journal_entries").update(payload).eq("id", noteId)
      if (error) {
        console.error("[journal] Failed to save note:", error)
        return false
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

      const { error } = await supabase.from("journal_entries").delete().eq("id", noteId)
      if (error) {
        console.error("[journal] Failed to delete note:", error)
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
        console.error("[journal] Failed to create folder:", error)
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
        console.error("[journal] Failed to rename folder:", error)
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
        console.error("[journal] Failed to delete folder:", error)
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
    createNote,
    updateNote,
    deleteNote,
    createFolder,
    renameFolder,
    deleteFolder,
  }
}

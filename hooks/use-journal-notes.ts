"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { createClient, getAuthHeader } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { deleteAttachmentsForNote } from "@/lib/journal-attachments"
import { deriveTitle, derivePreview, slugify } from "@/lib/journal-markdown"
import { journalResource } from "@/lib/app-data"
import {
  NOTE_COLUMNS,
  type JournalFolder,
  type JournalNote,
  type NoteRow,
  loadJournalData,
  mapNote,
} from "@/lib/journal-notes-query"
import { log } from "@/lib/log"

export type { JournalNote, JournalFolder }

export function useJournalNotes() {
  const supabase = useMemo(() => createClient(), [])
  const { isAuthenticated, userId } = useAuth()
  // Seeded from the warmed snapshot (components/data-warmer.tsx) rather than from empty. A
  // returning visit therefore renders its notes in its *first* frame, which is what makes a swipe
  // land on the Journal rather than on the Journal's loading state.
  const warmed = journalResource.peek()
  const [notes, setNotes] = useState<JournalNote[]>(warmed?.notes ?? [])
  const [folders, setFolders] = useState<JournalFolder[]>(warmed?.folders ?? [])
  const [isLoading, setIsLoading] = useState(warmed === undefined)
  const notesRef = useRef(notes)

  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  // The hook owns the state and the cache is a mirror of it, never the other way round. Every
  // existing mutation site — create, rename, move, delete — keeps setting state exactly as it
  // did, and this is what stops any of them being lost to a stale snapshot on the way back.
  useEffect(() => {
    if (!isLoading) journalResource.set({ notes, folders })
  }, [notes, folders, isLoading])

  const reload = useCallback(async () => {
    if (!isAuthenticated) {
      setNotes([])
      setFolders([])
      setIsLoading(false)
      return
    }

    // Only a cold hook shows a loading state. A revalidation happens underneath whatever is
    // already on screen — stale-while-revalidate, the point of which is that nothing blinks.
    if (journalResource.peek() === undefined) setIsLoading(true)
    try {
      const { notes: loadedNotes, folders: loadedFolders } = await loadJournalData(supabase)
      setNotes(loadedNotes)
      setFolders(loadedFolders)
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
      sessionId?: string | null
      practiceType?: string | null
      playedAt?: Date
    }): Promise<JournalNote | null> => {
      if (!isAuthenticated || !userId) return null

      const contentMd = params.contentMd ?? ""
      const playedAt = params.playedAt ?? new Date()
      const title = deriveTitle(contentMd)
      // Slug is generated once here and never rewritten on rename, so links keep resolving.
      const slug = slugify(title, `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`)

      // 1. Try server endpoint first (handles auth session via cookies + optional admin bypass)
      try {
        const authHeader = await getAuthHeader()
        const response = await fetch("/api/journal/note", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({
            contentMd,
            title,
            slug,
            folderId: params.folderId ?? null,
            meditationId: params.meditationId ?? null,
            meditationTitle: params.meditationTitle ?? null,
            sessionId: params.sessionId ?? null,
            practiceType: params.practiceType ?? null,
            playedAt: playedAt.toISOString(),
          }),
        })

        if (response.ok) {
          const json = await response.json()
          if (json.note) {
            const note = mapNote(json.note as NoteRow)
            setNotes((previous) => [note, ...previous])
            return note
          }
        } else {
          log.warn("[journal] POST /api/journal/note returned status:", response.status)
        }
      } catch (err) {
        log.warn("[journal] POST /api/journal/note network error, trying direct client insert:", err)
      }

      // 2. Fallback: Direct client insert with fresh session check
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const effectiveUserId = sessionData?.session?.user?.id || userId

        const { data, error } = await supabase
          .from("journal_entries")
          .insert({
            profile_id: effectiveUserId,
            content_md: contentMd,
            note: contentMd,
            title,
            slug,
            folder_id: params.folderId ?? null,
            meditation_id: params.meditationId ?? null,
            meditation_title: params.meditationTitle ?? null,
            session_id: params.sessionId ?? null,
            practice_type: params.practiceType ?? null,
            played_at: playedAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select(NOTE_COLUMNS)
          .single()

        if (!error && data) {
          const note = mapNote(data as NoteRow)
          setNotes((previous) => [note, ...previous])
          return note
        }

        if (error) {
          log.error("[journal] Failed to create note in database:", error)
        }
      } catch (clientErr) {
        log.error("[journal] Client insert error:", clientErr)
      }

      // 3. Fallback: Create optimistic local note so user work is never lost
      const fallbackNote: JournalNote = {
        id: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        slug,
        title,
        preview: derivePreview(contentMd),
        contentMd,
        noteKey: null,
        isBodyLoaded: true,
        folderId: params.folderId ?? null,
        meditationId: params.meditationId ?? null,
        meditationTitle: params.meditationTitle ?? null,
        sessionId: params.sessionId ?? null,
        practiceType: params.practiceType ?? null,
        tags: [],
        font: null,
        playedAt: playedAt.toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setNotes((previous) => [fallbackNote, ...previous])
      return fallbackNote
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
      if (existing.isBodyLoaded || noteId.startsWith("local-")) return existing.contentMd

      try {
        const authHeader = await getAuthHeader()
        const response = await fetch(`/api/journal/note?id=${encodeURIComponent(noteId)}`, {
          headers: { ...authHeader },
        })
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

      if (!isAuthenticated || !userId || noteId.startsWith("local-")) return true

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
          const authHeader = await getAuthHeader()
          const response = await fetch("/api/journal/note", {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authHeader },
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

      if (!isAuthenticated || !userId || noteId.startsWith("local-")) return true

      // Reclaim the note's stored files first. The metadata rows would cascade with the note,
      // but the R2 objects would be left behind counting against the user's usage forever.
      await deleteAttachmentsForNote(noteId)
      try {
        const authHeader = await getAuthHeader()
        await fetch(`/api/journal/note?id=${encodeURIComponent(noteId)}`, {
          method: "DELETE",
          headers: { ...authHeader },
        })
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

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

const STORAGE_KEY = "abhi.journal.entries"

export type JournalEntry = {
  id: string
  meditationId: string
  meditationTitle: string
  playedAt: string
  note?: string
}

export type RecordPlaybackOptions = {
  playedAt?: Date | string
  note?: string
}

type RecordPlaybackInput = {
  id: string
  title: string
}

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID()
    } catch (error) {
      // Fallback to timestamp-based id
    }
  }
  return `journal_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const normalizeDate = (value: Date | string | undefined) => {
  if (!value) return new Date()
  if (value instanceof Date) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return new Date()
  }
  return parsed
}

const differenceInMinutes = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) / 60000

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as JournalEntry[]
        if (Array.isArray(parsed)) {
          setEntries(
            parsed
              .filter((entry) => typeof entry?.id === "string" && typeof entry?.meditationId === "string")
              .map((entry) => ({
                ...entry,
                meditationTitle: entry.meditationTitle ?? "Meditation",
              })),
          )
        }
      }
    } catch (error) {
      console.error("Failed to load journal entries", error)
    } finally {
      setIsInitialized(true)
    }
  }, [])

  useEffect(() => {
    if (!isInitialized || typeof window === "undefined") return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    } catch (error) {
      console.error("Failed to persist journal entries", error)
    }
  }, [entries, isInitialized])

  const entriesById = useMemo(() => {
    const map = new Map<string, JournalEntry>()
    for (const entry of entries) {
      map.set(entry.id, entry)
    }
    return map
  }, [entries])

  const recordPlayback = useCallback(
    (meditation: RecordPlaybackInput, options?: RecordPlaybackOptions) => {
      let createdEntry: JournalEntry | null = null
      const playedAtDate = normalizeDate(options?.playedAt)
      const noteValue = options?.note?.trim()

      setEntries((previous) => {
        const existing = [...previous]
        const latestForMeditation = [...existing]
          .reverse()
          .find((entry) => entry.meditationId === meditation.id)

        if (latestForMeditation) {
          const latestDate = new Date(latestForMeditation.playedAt)
          if (!Number.isNaN(latestDate.getTime()) && differenceInMinutes(latestDate, playedAtDate) < 1) {
            const updated = existing.map((entry) =>
              entry.id === latestForMeditation.id
                ? {
                    ...entry,
                    playedAt: playedAtDate.toISOString(),
                    meditationTitle: meditation.title?.trim() || entry.meditationTitle,
                    note: noteValue !== undefined ? noteValue : entry.note,
                  }
                : entry,
            )
            createdEntry = updated.find((entry) => entry.id === latestForMeditation.id) ?? null
            return updated
          }
        }

        const newEntry: JournalEntry = {
          id: createId(),
          meditationId: meditation.id,
          meditationTitle: meditation.title?.trim() || "Meditation",
          playedAt: playedAtDate.toISOString(),
          note: noteValue && noteValue.length > 0 ? noteValue : undefined,
        }
        createdEntry = newEntry
        return [...existing, newEntry]
      })

      return createdEntry
    },
    [],
  )

  const updateEntryNote = useCallback((entryId: string, note: string) => {
    const trimmed = note.trim()
    let updatedEntry: JournalEntry | null = null
    setEntries((previous) =>
      previous.map((entry) => {
        if (entry.id !== entryId) return entry
        updatedEntry = { ...entry, note: trimmed.length > 0 ? trimmed : undefined }
        return updatedEntry
      }),
    )
    return updatedEntry ?? entriesById.get(entryId) ?? null
  }, [entriesById])

  const deleteEntry = useCallback((entryId: string) => {
    setEntries((previous) => previous.filter((entry) => entry.id !== entryId))
  }, [])

  return {
    entries,
    recordPlayback,
    updateEntryNote,
    deleteEntry,
  }
}

"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import { TEST_PROFILE_ID } from "@/lib/test-profile"

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

const sanitizeTitle = (value: string | undefined | null) => value?.trim() || "Meditation"

type JournalEntryRow = {
  id: string
  profile_id: string
  meditation_id: string
  meditation_title: string | null
  played_at: string
  note: string | null
}

const mapRowToEntry = (row: JournalEntryRow): JournalEntry => ({
  id: row.id,
  meditationId: row.meditation_id,
  meditationTitle: sanitizeTitle(row.meditation_title),
  playedAt: new Date(row.played_at).toISOString(),
  note: row.note ?? undefined,
})

export function useJournal() {
  const supabase = useMemo(() => createClient(), [])
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const entriesRef = useRef(entries)

  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  useEffect(() => {
    let isActive = true

    const loadEntries = async () => {
      try {
        const { data, error } = await supabase
          .from("journal_entries")
          .select("id, profile_id, meditation_id, meditation_title, played_at, note")
          .eq("profile_id", TEST_PROFILE_ID)
          .order("played_at", { ascending: true })

        if (!isActive) {
          return
        }

        if (error) {
          console.error("Failed to fetch journal entries", error)
          setEntries([])
          return
        }

        setEntries(Array.isArray(data) ? data.map(mapRowToEntry) : [])
      } catch (error) {
        if (isActive) {
          console.error("Unexpected error fetching journal entries", error)
          setEntries([])
        }
      }
    }

    void loadEntries()

    return () => {
      isActive = false
    }
  }, [supabase])

  const recordPlayback = useCallback(
    async (meditation: RecordPlaybackInput, options?: RecordPlaybackOptions) => {
      const playedAtDate = normalizeDate(options?.playedAt)
      const noteValue = options?.note?.trim()
      const currentEntries = entriesRef.current
      const latestForMeditation = [...currentEntries]
        .reverse()
        .find((entry) => entry.meditationId === meditation.id)

      const normalizedTitle = sanitizeTitle(meditation.title ?? latestForMeditation?.meditationTitle)
      const note = noteValue && noteValue.length > 0 ? noteValue : undefined

      if (latestForMeditation) {
        const latestDate = new Date(latestForMeditation.playedAt)
        if (!Number.isNaN(latestDate.getTime()) && differenceInMinutes(latestDate, playedAtDate) < 1) {
          const updatedEntry: JournalEntry = {
            ...latestForMeditation,
            playedAt: playedAtDate.toISOString(),
            meditationTitle: normalizedTitle,
            note: note ?? latestForMeditation.note,
          }

          setEntries((previous) =>
            previous.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry)),
          )

          const { data, error } = await supabase
            .from("journal_entries")
            .update({
              played_at: updatedEntry.playedAt,
              meditation_title: updatedEntry.meditationTitle,
              note: updatedEntry.note ?? null,
            })
            .eq("id", updatedEntry.id)
            .eq("profile_id", TEST_PROFILE_ID)
            .select("id, profile_id, meditation_id, meditation_title, played_at, note")
            .single()

          if (error) {
            console.error("Failed to update journal entry", error)
            setEntries((previous) =>
              previous.map((entry) => (entry.id === latestForMeditation.id ? latestForMeditation : entry)),
            )
            return latestForMeditation
          }

          if (data) {
            const normalized = mapRowToEntry(data)
            setEntries((previous) =>
              previous.map((entry) => (entry.id === normalized.id ? normalized : entry)),
            )
            return normalized
          }

          return updatedEntry
        }
      }

      const newEntry: JournalEntry = {
        id: createId(),
        meditationId: meditation.id,
        meditationTitle: normalizedTitle,
        playedAt: playedAtDate.toISOString(),
        note,
      }

      setEntries((previous) => [...previous, newEntry])

      const { data, error } = await supabase
        .from("journal_entries")
        .insert({
          id: newEntry.id,
          profile_id: TEST_PROFILE_ID,
          meditation_id: newEntry.meditationId,
          meditation_title: newEntry.meditationTitle,
          played_at: newEntry.playedAt,
          note: newEntry.note ?? null,
        })
        .select("id, profile_id, meditation_id, meditation_title, played_at, note")
        .single()

      if (error) {
        console.error("Failed to record journal entry", error)
        setEntries((previous) => previous.filter((entry) => entry.id !== newEntry.id))
        return null
      }

      if (data) {
        const normalized = mapRowToEntry(data)
        setEntries((previous) =>
          previous.map((entry) => (entry.id === normalized.id ? normalized : entry)),
        )
        return normalized
      }

      return newEntry
    },
    [supabase],
  )

  const updateEntryNote = useCallback(
    async (entryId: string, note: string) => {
      const trimmed = note.trim()
      const nextNote = trimmed.length > 0 ? trimmed : undefined
      const previousEntry = entriesRef.current.find((entry) => entry.id === entryId) ?? null

      if (!previousEntry) {
        return null
      }

      const optimisticEntry: JournalEntry = { ...previousEntry, note: nextNote }
      setEntries((previous) => previous.map((entry) => (entry.id === entryId ? optimisticEntry : entry)))

      const { data, error } = await supabase
        .from("journal_entries")
        .update({ note: nextNote ?? null })
        .eq("id", entryId)
        .eq("profile_id", TEST_PROFILE_ID)
        .select("id, profile_id, meditation_id, meditation_title, played_at, note")
        .single()

      if (error) {
        console.error("Failed to update journal note", error)
        setEntries((previous) => previous.map((entry) => (entry.id === entryId ? previousEntry : entry)))
        return previousEntry
      }

      if (data) {
        const normalized = mapRowToEntry(data)
        setEntries((previous) => previous.map((entry) => (entry.id === entryId ? normalized : entry)))
        return normalized
      }

      return optimisticEntry
    },
    [supabase],
  )

  const deleteEntry = useCallback(
    async (entryId: string) => {
      const previousEntries = entriesRef.current
      setEntries((previous) => previous.filter((entry) => entry.id !== entryId))

      const { error } = await supabase
        .from("journal_entries")
        .delete()
        .eq("id", entryId)
        .eq("profile_id", TEST_PROFILE_ID)

      if (error) {
        console.error("Failed to delete journal entry", error)
        setEntries([...previousEntries])
        return false
      }

      return true
    },
    [supabase],
  )

  return {
    entries,
    recordPlayback,
    updateEntryNote,
    deleteEntry,
  }
}

"use client"

/**
 * Resolves the identifiers stored in a note's markdown back into human-readable titles.
 *
 * Markdown only carries slugs — `[[Meditations/metta-...]]`, `> — [[morning-sit]]` — because a
 * slug is the stable thing that keeps resolving years later and survives a rename. Titles are
 * therefore looked up at render time rather than duplicated into the note body, which would go
 * stale the moment a meditation or note was retitled.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react"

type RefMaps = {
  meditationTitleBySlug: Record<string, string>
  meditationIdBySlug: Record<string, string>
  noteTitleBySlug: Record<string, string>
}

const JournalRefContext = createContext<RefMaps>({
  meditationTitleBySlug: {},
  meditationIdBySlug: {},
  noteTitleBySlug: {},
})

export function JournalRefProvider({
  meditations,
  notes,
  children,
}: {
  meditations: { id: string; slug: string; title: string }[]
  notes: { slug: string; title: string }[]
  children: ReactNode
}) {
  const value = useMemo<RefMaps>(() => {
    const meditationTitleBySlug: Record<string, string> = {}
    const meditationIdBySlug: Record<string, string> = {}
    for (const meditation of meditations) {
      meditationTitleBySlug[meditation.slug] = meditation.title
      meditationIdBySlug[meditation.slug] = meditation.id
    }

    const noteTitleBySlug: Record<string, string> = {}
    for (const note of notes) {
      noteTitleBySlug[note.slug] = note.title
    }

    return { meditationTitleBySlug, meditationIdBySlug, noteTitleBySlug }
  }, [meditations, notes])

  return <JournalRefContext.Provider value={value}>{children}</JournalRefContext.Provider>
}

export const useJournalRefs = () => useContext(JournalRefContext)

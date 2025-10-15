"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  CalendarDays,
  Clock,
  NotebookPen,
  BookOpenCheck,
  Sparkles,
} from "lucide-react"

import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useJournal, type JournalEntry } from "@/hooks/use-journal"
import { MeditationLibrary, type SavedMeditation } from "@/lib/meditation-library"
import { cn } from "@/lib/utils"

const formatTimeLabel = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)

const formatLongDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)

const formatMonth = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date)

const getDateKey = (date: Date) => date.toISOString().split("T")[0]

const parseDateKey = (key: string | null) => {
  if (!key) return null
  const parsed = new Date(key)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const getDayLabel = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
  }).format(date)

const ensureMinimumDays = (keys: string[]): string[] => {
  if (keys.length >= 5) return keys
  const padded = [...keys]
  const reference = keys[0] ?? getDateKey(new Date())
  let cursor = new Date(reference)
  while (padded.length < 5) {
    cursor = new Date(cursor)
    cursor.setDate(cursor.getDate() - 1)
    padded.unshift(getDateKey(cursor))
  }
  return padded
}

const sameDay = (a: string, b: string) => a === b

export default function JournalPage() {
  const { entries, updateEntryNote } = useJournal()
  const [meditations, setMeditations] = useState<SavedMeditation[]>([])
  const [activeTab, setActiveTab] = useState<"meditation" | "date">("date")
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [selectedMeditationId, setSelectedMeditationId] = useState<string | null>(null)
  const [activeMeditationEntryId, setActiveMeditationEntryId] = useState<string | null>(null)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const dayRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    let isMounted = true
    MeditationLibrary.getAllMeditations()
      .then((all) => {
        if (!isMounted) return
        setMeditations(all)
      })
      .catch((error) => {
        console.error("Unable to load meditations", error)
      })
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    setNoteDrafts((previous) => {
      const next: Record<string, string> = {}
      for (const entry of entries) {
        const existingDraft = previous[entry.id]
        if (typeof existingDraft === "string" && existingDraft.length > 0) {
          next[entry.id] = existingDraft
        } else {
          next[entry.id] = entry.note ?? ""
        }
      }
      return next
    })
  }, [entries])

  const availableDayKeys = useMemo(() => {
    const unique = new Set<string>()
    unique.add(getDateKey(new Date()))
    for (const entry of entries) {
      const key = getDateKey(new Date(entry.playedAt))
      unique.add(key)
    }
    const sorted = Array.from(unique).sort((a, b) => a.localeCompare(b))
    return ensureMinimumDays(sorted)
  }, [entries])

  const selectedDate = useMemo(() => parseDateKey(selectedDateKey), [selectedDateKey])

  useEffect(() => {
    const paramDate = searchParams.get("date")
    const paramMeditation = searchParams.get("meditation")
    const paramEntry = searchParams.get("entry")

    if (paramMeditation) {
      setActiveTab("meditation")
      setSelectedMeditationId(paramMeditation)
      if (paramEntry) {
        setActiveMeditationEntryId(paramEntry)
      }
    }

    if (paramDate) {
      const parsed = parseDateKey(paramDate)
      if (parsed) {
        setActiveTab("date")
        setSelectedDateKey(getDateKey(parsed))
      }
    }
  }, [searchParams])

  useEffect(() => {
    if (!selectedDateKey && availableDayKeys.length > 0) {
      setSelectedDateKey(availableDayKeys[availableDayKeys.length - 1])
    }
  }, [availableDayKeys, selectedDateKey])

  useEffect(() => {
    const handle = setTimeout(() => {
      if (!selectedDateKey) return
      const button = dayRefs.current[selectedDateKey]
      if (button) {
        button.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
      }
    }, 60)

    return () => clearTimeout(handle)
  }, [selectedDateKey])

  useEffect(() => {
    if (!selectedMeditationId) {
      const meditationIdsWithEntries = new Set(entries.map((entry) => entry.meditationId))
      const firstId = meditations.find((meditation) => meditationIdsWithEntries.has(meditation.id))?.id
      if (firstId) {
        setSelectedMeditationId(firstId)
      }
      return
    }

    const entriesForMeditation = entries.filter((entry) => entry.meditationId === selectedMeditationId)
    if (entriesForMeditation.length > 0) {
      if (!activeMeditationEntryId || !entriesForMeditation.some((entry) => entry.id === activeMeditationEntryId)) {
        setActiveMeditationEntryId(entriesForMeditation[0]?.id ?? null)
      }
    } else {
      setActiveMeditationEntryId(null)
    }
  }, [entries, meditations, selectedMeditationId, activeMeditationEntryId])

  const entriesByDate = useMemo(() => {
    const map = new Map<string, typeof entries>()
    for (const entry of entries) {
      const key = getDateKey(new Date(entry.playedAt))
      const existing = map.get(key) ?? []
      existing.push(entry)
      map.set(key, existing)
    }
    for (const key of map.keys()) {
      map.get(key)?.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
    }
    return map
  }, [entries])

  const entriesForSelectedDate = selectedDateKey ? entriesByDate.get(selectedDateKey) ?? [] : []

  const meditationEntries = useMemo(() => {
    const groups = new Map<string, JournalEntry[]>()
    for (const entry of entries) {
      const existing = groups.get(entry.meditationId)
      if (existing) {
        existing.push(entry)
      } else {
        groups.set(entry.meditationId, [entry])
      }
    }
    for (const list of groups.values()) {
      list.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
    }
    return groups
  }, [entries])

  const selectedMeditation = meditations.find((meditation) => meditation.id === selectedMeditationId) ?? null
  const selectedMeditationEntries = selectedMeditationId ? meditationEntries.get(selectedMeditationId) ?? [] : []
  const activeMeditationEntry = activeMeditationEntryId
    ? selectedMeditationEntries.find((entry) => entry.id === activeMeditationEntryId) ?? null
    : selectedMeditationEntries[0] ?? null

  const handleSaveNote = (entryId: string) => {
    const draft = noteDrafts[entryId] ?? ""
    void updateEntryNote(entryId, draft)
    toast({
      title: "Journal updated",
      description: "Your reflection has been saved.",
    })
  }

  const handleSelectMeditation = (meditationId: string) => {
    setSelectedMeditationId(meditationId)
    setActiveMeditationEntryId(null)
    router.replace(`/journal?meditation=${encodeURIComponent(meditationId)}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-logo-rose-100 via-white to-logo-emerald-50">
      <Navigation />
      <main className="px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mt-6 mb-10">
            <div className="flex justify-center mb-[25px]">
              <div className="relative">
                <div className="flex justify-center items-center space-x-[5px]">
                  <div className="bg-gradient-to-br from-logo-teal to-logo-emerald rounded-sm transform rotate-12 w-[16px] h-[16px] shadow-md" />
                  <div className="bg-gradient-to-br from-logo-rose to-pink-300 rounded-full h-[11px] w-[11px] shadow" />
                  <div className="w-5 bg-gradient-to-br from-logo-amber to-orange-300 rounded-[4px] transform h-[11px] shadow-sm" />
                  <div className="bg-gradient-to-br from-gray-600 to-gray-500 px-0 mx-0 border-[3px] bg-muted h-11 w-3 rounded border-stone-200 shadow-md" />
                  <div className="w-5 bg-gradient-to-br from-logo-purple to-indigo-300 rounded-[4px] transform h-[11px] pl-0 ml-2 shadow-sm" />
                  <div className="bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full h-[11px] w-[11px] shadow" />
                  <div className="bg-gradient-to-br from-logo-emerald to-logo-teal rounded-sm transform -rotate-12 w-[16px] h-[16px] shadow-md" />
                </div>
              </div>
            </div>
            
            
          </div>

          <div className="flex justify-center mb-8">
            <div className="flex p-1 bg-muted rounded-sm shadow-inner text-sm text-gray-600">
              <button
                onClick={() => setActiveTab("meditation")}
                className={cn(
                  "transition-all rounded-sm text-sm tracking-tight font-black font-serif py-3 px-4 text-gray-600",
                  activeTab === "meditation" ? "bg-white text-gray-600 shadow-sm" : "",
                )}
              >
                By Meditation
              </button>
              <button
                onClick={() => setActiveTab("date")}
                className={cn(
                  "transition-all rounded-sm text-sm tracking-tight font-black font-serif py-3 px-4 text-gray-600",
                  activeTab === "date" ? "bg-white text-gray-600 shadow-sm" : "",
                )}
              >
                By Date
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "date" && (
              <motion.div
                key="date"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="p-6 lg:p-8 bg-white/90 backdrop-blur-md shadow-xl border-none">
                  <div className="flex flex-col gap-6">
                    <div className="text-center">
                      <div className="text-xs uppercase tracking-[0.2em] text-gray-400 font-black mb-2">Journal by Date</div>
                      {selectedDate && (
                        <div className="text-sm font-black text-gray-500">{formatMonth(selectedDate)}</div>
                      )}
                    </div>

                    <div>
                      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent px-1">
                        <div className="flex gap-3 min-w-max py-2">
                          {availableDayKeys.map((key) => {
                            const date = new Date(key)
                            const isSelected = selectedDateKey ? sameDay(selectedDateKey, key) : false
                            const [weekdayLabel, dayNumber] = getDayLabel(date).split(" ")
                            return (
                              <button
                                key={key}
                                ref={(element) => {
                                  dayRefs.current[key] = element
                                }}
                                onClick={() => {
                                  setSelectedDateKey(key)
                                  router.replace(`/journal?date=${key}`)
                                }}
                                className={cn(
                                  "flex flex-col items-center justify-center px-4 py-3 rounded-xl border-[3px] transition-all duration-200 shadow-sm min-w-[90px]",
                                  isSelected
                                    ? "border-stone-300 bg-white text-gray-700 scale-105"
                                    : "border-gray-400/40 bg-muted/60 text-gray-500 hover:bg-white",
                                )}
                              >
                                <span className="text-[10px] uppercase tracking-[0.3em] font-black text-gray-400">
                                  {weekdayLabel}
                                </span>
                                <span
                                  className={cn(
                                    "text-lg font-black font-serif",
                                    isSelected ? "text-gray-700" : "text-gray-500",
                                  )}
                                >
                                  {dayNumber}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {entriesForSelectedDate.length === 0 ? (
                        <div className="text-center py-10">
                          <Sparkles className="mx-auto h-10 w-10 text-logo-rose-300 mb-3" />
                          <p className="text-sm text-gray-500 font-serif font-black">No entries yet</p>
                        </div>
                      ) : (
                        entriesForSelectedDate.map((entry) => {
                          const entryDate = new Date(entry.playedAt)
                          const draft = noteDrafts[entry.id] ?? ""
                          const hasChanged = (entry.note ?? "") !== draft
                          return (
                            <Card key={entry.id} className="p-5 border-[3px] border-muted bg-gradient-to-br from-white to-stone-50 shadow-md">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gray-400 font-black">
                                    <CalendarDays className="h-4 w-4" />
                                    <span>{formatLongDate(entryDate)}</span>
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600 font-black">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      {formatTimeLabel(entryDate)}
                                    </span>
                                    <span className="px-3 py-1 rounded-full bg-muted/80 border border-gray-300 text-xs font-black text-gray-600">
                                      {entry.meditationTitle}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="self-start text-gray-500 hover:text-gray-700"
                                  onClick={() => router.push(`/library?meditation=${entry.meditationId}`)}
                                >
                                  Open in Library
                                </Button>
                              </div>
                              <div className="mt-5 space-y-3">
                                <Textarea
                                  value={draft}
                                  onChange={(event) => {
                                    setNoteDrafts((previous) => ({
                                      ...previous,
                                      [entry.id]: event.target.value,
                                    }))
                                  }}
                                  rows={4}
                                  placeholder="What arose during this session?"
                                  className="font-serif text-sm text-gray-600"
                                />
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-500 hover:text-gray-700"
                                    onClick={() => router.push(`/journal?meditation=${entry.meditationId}&entry=${entry.id}`)}
                                  >
                                    View Meditation History
                                  </Button>
                                  <Button
                                    onClick={() => handleSaveNote(entry.id)}
                                    disabled={!hasChanged}
                                    className="bg-gradient-to-r from-logo-rose-300 to-logo-emerald-400 text-white font-black shadow-md hover:shadow-none"
                                  >
                                    Save Reflection
                                  </Button>
                                </div>
                                {entry.note && !hasChanged && (
                                  <div className="text-sm text-gray-600 font-serif bg-muted/60 border border-muted rounded-md p-3">
                                    {entry.note}
                                  </div>
                                )}
                              </div>
                            </Card>
                          )
                        })
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === "meditation" && (
              <motion.div
                key="meditation"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="p-6 lg:p-8 bg-white/90 backdrop-blur-md shadow-xl border-none">
                  <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                    <div className="space-y-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-gray-400 font-black">Meditations</div>
                      <div className="space-y-3 max-h-[440px] overflow-y-auto pr-2">
                        {meditations.map((meditation) => {
                          const entryCount = meditationEntries.get(meditation.id)?.length ?? 0
                          const isSelected = meditation.id === selectedMeditationId
                          return (
                            <button
                              key={meditation.id}
                              onClick={() => handleSelectMeditation(meditation.id)}
                              className={cn(
                                "w-full text-left rounded-xl border-[3px] px-4 py-3 transition-all font-serif",
                                isSelected
                                  ? "border-stone-300 bg-white shadow-md text-gray-700"
                                  : "border-gray-300/60 bg-muted/60 text-gray-500 hover:bg-white",
                              )}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-black text-gray-700 line-clamp-2">{meditation.title}</div>
                                  <div className="text-[11px] uppercase tracking-[0.3em] text-gray-400 mt-1 font-black">
                                    {entryCount > 0 ? `${entryCount} entr${entryCount === 1 ? "y" : "ies"}` : "No entries yet"}
                                  </div>
                                </div>
                                <NotebookPen className="h-4 w-4 text-logo-rose-400" />
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-gray-400 font-black mb-2">
                            Journal Entries
                          </div>
                          <div className="text-lg font-black text-gray-700 font-serif">
                            {selectedMeditation?.title ?? "Select a meditation"}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-gray-700"
                          onClick={() => {
                            const libraryPath = selectedMeditation
                              ? `/library?meditation=${selectedMeditation.id}`
                              : "/library"
                            router.push(libraryPath)
                          }}
                        >
                          View in Library
                        </Button>
                      </div>

                      {selectedMeditationEntries.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                          <BookOpenCheck className="mx-auto h-10 w-10 text-logo-emerald-400 mb-3" />
                          <p className="text-sm text-gray-500 font-serif font-black">
                            No journal reflections for this meditation yet.
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {selectedMeditationEntries.map((entry) => {
                              const entryDate = new Date(entry.playedAt)
                              const isActive = entry.id === activeMeditationEntry?.id
                              return (
                                <button
                                  key={entry.id}
                                  onClick={() => setActiveMeditationEntryId(entry.id)}
                                  className={cn(
                                    "rounded-xl border-[3px] px-4 py-3 text-left transition-all",
                                    isActive
                                      ? "border-stone-300 bg-white shadow-md text-gray-700"
                                      : "border-gray-300/60 bg-muted/60 text-gray-500 hover:bg-white",
                                  )}
                                >
                                  <div className="text-[11px] uppercase tracking-[0.3em] text-gray-400 font-black mb-1">
                                    {formatLongDate(entryDate)}
                                  </div>
                                  <div className="text-sm font-black text-gray-700 mb-1">
                                    {formatTimeLabel(entryDate)}
                                  </div>
                                  <div className="text-xs text-gray-500 line-clamp-3 font-serif">
                                    {entry.note ?? "Tap to add a reflection."}
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                          <Card className="p-5 border-[3px] border-muted bg-gradient-to-br from-white to-stone-50 shadow-md">
                            {activeMeditationEntry ? (
                              <div className="space-y-4">
                                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 font-black">
                                  <span className="flex items-center gap-1">
                                    <CalendarDays className="h-4 w-4" />
                                    {formatLongDate(new Date(activeMeditationEntry.playedAt))}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {formatTimeLabel(new Date(activeMeditationEntry.playedAt))}
                                  </span>
                                </div>
                                <Textarea
                                  value={noteDrafts[activeMeditationEntry.id] ?? ""}
                                  onChange={(event) => {
                                    setNoteDrafts((previous) => ({
                                      ...previous,
                                      [activeMeditationEntry.id]: event.target.value,
                                    }))
                                  }}
                                  rows={6}
                                  placeholder="What stood out to you during this session?"
                                  className="font-serif text-sm text-gray-600"
                                />
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-500 hover:text-gray-700"
                                    onClick={() =>
                                      router.push(`/journal?date=${getDateKey(new Date(activeMeditationEntry.playedAt))}`)
                                    }
                                  >
                                    Jump to Date
                                  </Button>
                                  <Button
                                    onClick={() => handleSaveNote(activeMeditationEntry.id)}
                                    disabled={
                                      (activeMeditationEntry.note ?? "") === (noteDrafts[activeMeditationEntry.id] ?? "")
                                    }
                                    className="bg-gradient-to-r from-logo-rose-300 to-logo-emerald-400 text-white font-black shadow-md hover:shadow-none"
                                  >
                                    Save Reflection
                                  </Button>
                                </div>
                                {activeMeditationEntry.note &&
                                  activeMeditationEntry.note === (noteDrafts[activeMeditationEntry.id] ?? "") && (
                                    <div className="text-sm text-gray-600 font-serif bg-muted/60 border border-muted rounded-md p-3">
                                      {activeMeditationEntry.note}
                                    </div>
                                  )}
                              </div>
                            ) : (
                              <div className="text-center py-12 text-sm text-gray-500 font-serif font-black">
                                Choose a journal entry to view the full reflection.
                              </div>
                            )}
                          </Card>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

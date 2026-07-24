"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpenCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  NotebookPen,
  Plus,
  Sparkles,
} from "lucide-react"

import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AuthButtons } from "@/components/auth-buttons"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useJournal, type JournalEntry } from "@/hooks/use-journal"
import { useAuth } from "@/hooks/use-auth"
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

/** Compact form for the narrow entry cards, where the full weekday version gets truncated. */
const formatShortDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)

const dayLabelFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  day: "numeric",
})

/**
 * Reads weekday and day-number as separate fields. Formatting to one string and splitting on the
 * space is locale-dependent and yields them in the wrong order — en-US produces "24 Fri", not
 * "Fri 24" — so the parts API is the only order-safe way to pull these apart.
 */
const getDayParts = (date: Date) => {
  const parts = dayLabelFormatter.formatToParts(date)
  return {
    weekday: parts.find((part) => part.type === "weekday")?.value ?? "",
    day: parts.find((part) => part.type === "day")?.value ?? String(date.getDate()),
  }
}

const getDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Date keys are plain calendar days and must be reconstructed in LOCAL time.
 * `new Date("2026-07-24")` parses as UTC midnight, which — read back through the local getters
 * getDateKey uses — lands on the previous day in any negative-offset timezone, shifting the whole
 * day strip, its labels, and the ?date= round-trip by one day.
 */
const parseDateKey = (key: string | null): Date | null => {
  if (!key) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim())
  if (match) {
    const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const fallback = new Date(key)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

const dateFromKey = (key: string): Date => parseDateKey(key) ?? new Date()

const generateMonthDates = (referenceDate: Date): string[] => {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  const lastDay = new Date(year, month + 1, 0)

  const dates: string[] = []
  for (let day = 1; day <= lastDay.getDate(); day++) {
    dates.push(getDateKey(new Date(year, month, day)))
  }
  return dates
}

/** Same day-of-month in the neighbouring month, clamped to that month's length. */
const shiftMonthKey = (key: string, delta: number) => {
  const current = dateFromKey(key)
  const target = new Date(current.getFullYear(), current.getMonth() + delta, 1)
  const daysInTarget = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  const day = Math.min(current.getDate(), daysInTarget)
  return getDateKey(new Date(target.getFullYear(), target.getMonth(), day))
}

const combineDateAndTime = (dateKey: string, time: string) => {
  const base = dateFromKey(dateKey)
  const [hours, minutes] = time.split(":").map(Number)
  base.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0)
  return base
}

const getTimeValue = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`

const sameDay = (a: string, b: string) => a === b

const buildJournalHref = ({
  date,
  meditation,
  entry,
}: {
  date?: string | null
  meditation?: string | null
  entry?: string | null
}) => {
  const params = new URLSearchParams()
  if (date) {
    params.set("date", date)
  }
  if (meditation) {
    params.set("meditation", meditation)
  }
  if (entry && meditation) {
    params.set("entry", entry)
  }
  const query = params.toString()
  return query ? `/journal?${query}` : "/journal"
}


export default function JournalPage() {
  const { entries, isLoading: isLoadingEntries, recordPlayback, updateEntryNote, deleteEntry } = useJournal()
  const [meditations, setMeditations] = useState<SavedMeditation[]>([])
  const [activeTab, setActiveTab] = useState<"meditation" | "date">("date")
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [selectedMeditationId, setSelectedMeditationId] = useState<string | null>(null)
  const [activeMeditationEntryId, setActiveMeditationEntryId] = useState<string | null>(null)
  const [shouldAutoSelectMeditation, setShouldAutoSelectMeditation] = useState(true)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null)
  const [entryPendingDelete, setEntryPendingDelete] = useState<JournalEntry | null>(null)
  const [isDeletingEntry, setIsDeletingEntry] = useState(false)
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false)
  const [isCreatingEntry, setIsCreatingEntry] = useState(false)
  const [newEntryMeditationId, setNewEntryMeditationId] = useState("")
  const [newEntryDate, setNewEntryDate] = useState(() => getDateKey(new Date()))
  const [newEntryTime, setNewEntryTime] = useState(() => getTimeValue(new Date()))
  const [newEntryNote, setNewEntryNote] = useState("")
  const dayRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated, login } = useAuth()

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
  }, [isAuthenticated])

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

  const displayDayKeys = useMemo(() => {
    if (!selectedDateKey) return []
    return generateMonthDates(dateFromKey(selectedDateKey))
  }, [selectedDateKey])

  const selectedDate = useMemo(() => parseDateKey(selectedDateKey), [selectedDateKey])

  useEffect(() => {
    const paramDate = searchParams.get("date")
    const paramMeditation = searchParams.get("meditation")
    const paramEntry = searchParams.get("entry")

    if (paramMeditation) {
      setActiveTab("meditation")
      setSelectedMeditationId(paramMeditation)
      setShouldAutoSelectMeditation(false)
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

  // Open on the most recent day that actually has an entry, falling back to today.
  useEffect(() => {
    if (selectedDateKey) return
    const entryKeys = entries.map((entry) => getDateKey(new Date(entry.playedAt))).sort((a, b) => a.localeCompare(b))
    setSelectedDateKey(entryKeys[entryKeys.length - 1] ?? getDateKey(new Date()))
  }, [entries, selectedDateKey])

  useEffect(() => {
    const handle = setTimeout(() => {
      if (!selectedDateKey) return
      const button = dayRefs.current[selectedDateKey]
      if (button) {
        button.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
      }
    }, 100)

    return () => clearTimeout(handle)
  }, [selectedDateKey, displayDayKeys])

  useEffect(() => {
    if (!selectedMeditationId) {
      if (!shouldAutoSelectMeditation) {
        setActiveMeditationEntryId(null)
        return
      }

      const meditationIdsWithEntries = new Set(entries.map((entry) => entry.meditationId))
      const firstId = meditations.find((meditation) => meditationIdsWithEntries.has(meditation.id))?.id
      if (firstId) {
        setSelectedMeditationId(firstId)
        setShouldAutoSelectMeditation(false)
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
  }, [entries, meditations, selectedMeditationId, activeMeditationEntryId, shouldAutoSelectMeditation])

  const entriesByDate = useMemo(() => {
    const map = new Map<string, JournalEntry[]>()
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

  const entriesForSelectedDate = selectedDateKey ? (entriesByDate.get(selectedDateKey) ?? []) : []

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
  const selectedMeditationEntries = selectedMeditationId ? (meditationEntries.get(selectedMeditationId) ?? []) : []
  const activeMeditationEntry = activeMeditationEntryId
    ? (selectedMeditationEntries.find((entry) => entry.id === activeMeditationEntryId) ?? null)
    : (selectedMeditationEntries[0] ?? null)

  const handleSaveNote = async (entryId: string) => {
    const draft = noteDrafts[entryId] ?? ""
    setSavingEntryId(entryId)
    const result = await updateEntryNote(entryId, draft)
    setSavingEntryId(null)

    if (!result) {
      toast({
        title: "Unable to save reflection",
        description: "Please try again in a moment.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Journal updated",
      description: "Your reflection has been saved.",
    })
  }

  const handleConfirmDelete = async () => {
    if (!entryPendingDelete) return

    const entryId = entryPendingDelete.id
    const meditationId = entryPendingDelete.meditationId
    const entryCountForMeditation = meditationEntries.get(meditationId)?.length ?? 0

    setIsDeletingEntry(true)
    const didDelete = await deleteEntry(entryId)
    setIsDeletingEntry(false)

    if (!didDelete) {
      toast({
        title: "Unable to delete entry",
        description: "Please try again later.",
        variant: "destructive",
      })
      return
    }

    setEntryPendingDelete(null)

    setNoteDrafts((previous) => {
      const next = { ...previous }
      delete next[entryId]
      return next
    })

    if (activeMeditationEntryId === entryId) {
      setActiveMeditationEntryId(null)

      if (entryCountForMeditation <= 1) {
        setSelectedMeditationId(null)
        router.replace(buildJournalHref({}))
      } else {
        router.replace(buildJournalHref({ meditation: meditationId }))
      }
    }

    toast({
      title: "Journal entry deleted",
      description: "The reflection has been removed.",
    })
  }

  const handleShiftMonth = (delta: number) => {
    const base = selectedDateKey ?? getDateKey(new Date())
    const nextKey = shiftMonthKey(base, delta)
    setSelectedDateKey(nextKey)
    setActiveTab("date")
    router.replace(buildJournalHref({ date: nextKey }))
  }

  const handleSelectMeditation = (meditationId: string) => {
    if (selectedMeditationId === meditationId) {
      setSelectedMeditationId(null)
      setActiveMeditationEntryId(null)
      setShouldAutoSelectMeditation(false)
      setActiveTab("meditation")
      router.replace(buildJournalHref({}))
      return
    }

    const entriesForMeditation = meditationEntries.get(meditationId) ?? []
    const firstEntryId = entriesForMeditation[0]?.id ?? null

    setSelectedMeditationId(meditationId)
    setActiveMeditationEntryId(firstEntryId)
    setShouldAutoSelectMeditation(false)
    setActiveTab("meditation")
    router.replace(
      buildJournalHref({
        meditation: meditationId,
        entry: firstEntryId,
      }),
    )
  }

  const openNewEntryDialog = () => {
    const now = new Date()
    setNewEntryMeditationId(selectedMeditationId ?? meditations[0]?.id ?? "")
    setNewEntryDate(selectedDateKey ?? getDateKey(now))
    setNewEntryTime(getTimeValue(now))
    setNewEntryNote("")
    setIsNewEntryOpen(true)
  }

  const handleCreateEntry = async () => {
    const meditation = meditations.find((item) => item.id === newEntryMeditationId)
    if (!meditation) return

    const playedAt = combineDateAndTime(newEntryDate, newEntryTime)
    setIsCreatingEntry(true)
    const created = await recordPlayback(
      { id: meditation.id, title: meditation.title },
      { playedAt, note: newEntryNote.trim() || undefined },
    )
    setIsCreatingEntry(false)

    if (!created) {
      toast({
        title: "Unable to add entry",
        description: "Please try again in a moment.",
        variant: "destructive",
      })
      return
    }

    const dateKey = getDateKey(playedAt)
    setIsNewEntryOpen(false)
    setNewEntryNote("")
    setActiveTab("date")
    setSelectedDateKey(dateKey)
    router.replace(buildJournalHref({ date: dateKey }))

    toast({
      title: "Journal entry added",
      description: `Saved to ${formatLongDate(playedAt)}.`,
    })
  }

  const renderEntryActions = (entry: JournalEntry, secondaryAction?: ReactNode) => {
    const draft = noteDrafts[entry.id] ?? ""
    const hasChanged = (entry.note ?? "") !== draft
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {secondaryAction}
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-700"
          onClick={() => setEntryPendingDelete(entry)}
        >
          Delete
        </Button>
        <Button
          onClick={() => void handleSaveNote(entry.id)}
          disabled={!hasChanged || savingEntryId === entry.id}
          className="bg-gradient-to-r from-logo-rose-300 to-logo-emerald-400 text-white font-black shadow-md hover:shadow-none disabled:opacity-40 disabled:shadow-none"
        >
          {savingEntryId === entry.id ? "Saving..." : "Save Reflection"}
        </Button>
      </div>
    )
  }

  const showEntriesLoading = isAuthenticated && isLoadingEntries

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8 pt-20 md:pt-24">
      <Navigation showProfileButton />
      <main className="px-0">
        <div className="w-full md:max-w-5xl md:mx-auto space-y-0">
          {!isAuthenticated && (
            <div className="flex justify-center py-4 z-10 pt-0 pb-7">
              <AuthButtons onLogin={login} />
            </div>
          )}
          <div className="relative w-full md:max-w-4xl md:mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-none md:shadow-xl overflow-hidden transition-colors duration-300 ease-in-out">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm space-y-3 text-center p-6">
                <p className="text-lg text-gray-800 font-serif font-black">Create account to save</p>
              </div>
            )}
            <div className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20" />
                <div className="absolute top-2 left-8 w-16 h-12 bg-gradient-to-br from-emerald-300/30 to-teal-400/25 rounded-full transform rotate-12" />
                <div className="absolute top-6 right-12 w-20 h-8 bg-gradient-to-bl from-rose-300/25 to-purple-400/20 rounded-full transform -rotate-6" />
                <div className="absolute top-1 left-1/3 w-12 h-16 bg-gradient-to-tr from-amber-300/20 to-orange-400/15 rounded-full transform rotate-45" />
                <div className="absolute top-8 right-1/4 w-14 h-10 bg-gradient-to-tl from-blue-300/25 to-indigo-400/20 rounded-full transform -rotate-12" />
              </div>
              <div className="relative px-4 sm:px-8 lg:px-12 pt-16 pb-10">
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-[25px]">
                    <div className="relative">
                      <div className="flex justify-center items-center space-x-[5px]">
                        <div className="bg-gradient-to-br from-logo-teal to-logo-emerald rounded-sm transform rotate-12 w-[16px] h-[16px] shadow-md" />
                        <div className="bg-gradient-to-br from-logo-rose to-pink-300 rounded-full h-[11px] w-[11px] shadow" />
                        <div className="w-5 bg-gradient-to-br from-logo-amber to-orange-300 rounded-[4px] transform h-[11px] shadow-sm" />
                        <div className="bg-gradient-to-br from-gray-600 to-gray-500 px-0 border-[3px] bg-muted h-11 w-3 border-stone-200 shadow-md rounded-md" />
                        <div className="w-5 bg-gradient-to-br from-logo-purple to-indigo-300 rounded-[4px] transform h-[11px] pl-0 shadow-sm" />
                        <div className="bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full h-[11px] w-[11px] shadow" />
                        <div className="bg-gradient-to-br from-logo-emerald to-logo-teal rounded-sm transform -rotate-12 w-[16px] h-[16px] shadow-md" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center items-center gap-3 mb-8">
                  <div className="flex p-1 bg-muted rounded-sm shadow-inner text-sm text-gray-600">
                    <button
                      onClick={() => {
                        setActiveTab("date")
                        setShouldAutoSelectMeditation(false)
                      }}
                      className={cn(
                        "transition-all rounded-sm text-sm tracking-tight font-black font-serif py-3 px-4 text-gray-600",
                        activeTab === "date" ? "bg-white text-gray-600 shadow-md" : "",
                      )}
                    >
                      By Date
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("meditation")
                        setShouldAutoSelectMeditation(false)
                      }}
                      className={cn(
                        "transition-all rounded-sm text-sm tracking-tight font-black font-serif py-3 px-4 text-gray-600",
                        activeTab === "meditation" ? "bg-white text-gray-600 shadow-md" : "",
                      )}
                    >
                      By Meditation
                    </button>
                  </div>
                  <Button
                    size="sm"
                    onClick={openNewEntryDialog}
                    disabled={meditations.length === 0}
                    title={meditations.length === 0 ? "Save a meditation to your library first" : undefined}
                    className="bg-gradient-to-r from-logo-rose-300 to-logo-emerald-400 text-white font-black shadow-md hover:shadow-none disabled:opacity-40 disabled:shadow-none"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New entry
                  </Button>
                </div>

                <AnimatePresence mode="wait">
                  {activeTab === "date" && (
                    <motion.div
                      key="date"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Card className="p-0 sm:p-6 lg:p-8 shadow-none border-none">
                        <div className="flex flex-col gap-6">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Previous month"
                              onClick={() => handleShiftMonth(-1)}
                              className="text-gray-500 hover:text-gray-700 flex-shrink-0"
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <div className="font-black text-xl sm:text-2xl text-gray-600 tracking-tight text-center min-w-[9ch]">
                              {selectedDate ? formatMonth(selectedDate) : ""}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Next month"
                              onClick={() => handleShiftMonth(1)}
                              className="text-gray-500 hover:text-gray-700 flex-shrink-0"
                            >
                              <ChevronRight className="h-5 w-5" />
                            </Button>
                          </div>

                          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                            <div className="flex min-w-max px-2 py-6">
                              {displayDayKeys.map((key) => {
                                const date = dateFromKey(key)
                                const isSelected = selectedDateKey ? sameDay(selectedDateKey, key) : false
                                const { weekday, day } = getDayParts(date)
                                const hasEntries = entriesByDate.has(key)

                                return (
                                  <button
                                    key={key}
                                    ref={(element) => {
                                      dayRefs.current[key] = element
                                    }}
                                    onClick={() => {
                                      setSelectedDateKey(key)
                                      setActiveTab("date")
                                      router.replace(buildJournalHref({ date: key }))
                                    }}
                                    className={cn(
                                      "flex flex-col items-center justify-center rounded-xl transition-all duration-300 shadow-sm flex-shrink-0 gap-0 mx-1.5 tracking-tight border-[3px]",
                                      isSelected
                                        ? "border-stone-400 bg-white text-gray-800 scale-110 shadow-xl py-4 px-5 z-10"
                                        : "border-gray-400/40 bg-muted/60 text-gray-500 hover:bg-white hover:scale-105 py-3 px-4",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "uppercase tracking-[0.2em] font-black text-gray-400",
                                        isSelected ? "text-[11px]" : "text-[10px]",
                                      )}
                                    >
                                      {weekday}
                                    </span>
                                    <span
                                      className={cn(
                                        "font-black font-serif",
                                        isSelected ? "text-2xl text-gray-600" : "text-lg text-gray-500",
                                      )}
                                    >
                                      {day}
                                    </span>
                                    <span
                                      className={cn(
                                        "mt-1 h-1.5 w-1.5 rounded-full",
                                        hasEntries && !isSelected ? "bg-logo-emerald-400" : "bg-transparent",
                                      )}
                                    />
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          <div className="space-y-6">
                            {showEntriesLoading ? (
                              <div className="space-y-4" aria-busy="true">
                                {[0, 1].map((index) => (
                                  <div key={index} className="rounded-xl border-[3px] border-muted p-5 animate-pulse">
                                    <div className="h-3 w-40 bg-muted rounded mb-3" />
                                    <div className="h-3 w-24 bg-muted rounded mb-5" />
                                    <div className="h-20 w-full bg-muted/70 rounded" />
                                  </div>
                                ))}
                              </div>
                            ) : entriesForSelectedDate.length === 0 ? (
                              <div className="text-center py-10 pt-0 tracking-tight">
                                <Sparkles className="mx-auto h-10 w-10 text-logo-rose-300 mb-3" />
                                <p className="text-sm text-gray-500 font-serif font-black">No entries yet</p>
                                {meditations.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={openNewEntryDialog}
                                    className="mt-2 text-gray-500 hover:text-gray-700"
                                  >
                                    Add one for this day
                                  </Button>
                                )}
                              </div>
                            ) : (
                              entriesForSelectedDate.map((entry) => {
                                const entryDate = new Date(entry.playedAt)
                                const draft = noteDrafts[entry.id] ?? ""
                                return (
                                  <Card
                                    key={entry.id}
                                    className="p-5 border-[3px] border-muted bg-gradient-to-br from-white to-stone-50 shadow-md"
                                  >
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 text-xs text-gray-400 font-black">
                                          <CalendarDays className="h-4 w-4 flex-shrink-0" />
                                          <span className="font-serif tracking-normal truncate">
                                            {formatLongDate(entryDate)}
                                          </span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600 font-black">
                                          <span className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            {formatTimeLabel(entryDate)}
                                          </span>
                                          <span className="px-3 py-1 rounded-full bg-muted/80 border border-gray-300 text-xs font-black text-gray-600 max-w-full truncate">
                                            {entry.meditationTitle}
                                          </span>
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="self-start text-gray-500 hover:text-gray-700 flex-shrink-0"
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
                                        className="font-serif text-sm text-gray-600 bg-white/70"
                                      />
                                      {renderEntryActions(
                                        entry,
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-gray-500 hover:text-gray-700"
                                          onClick={() => {
                                            setActiveTab("meditation")
                                            setSelectedMeditationId(entry.meditationId)
                                            setActiveMeditationEntryId(entry.id)
                                            setShouldAutoSelectMeditation(false)
                                            router.push(
                                              buildJournalHref({
                                                meditation: entry.meditationId,
                                                entry: entry.id,
                                              }),
                                            )
                                          }}
                                        >
                                          View history
                                        </Button>,
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
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Card className="p-0 sm:p-6 lg:p-8 bg-transparent border-none">
                        <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
                          <div className="min-w-0 space-y-4">
                            <div className="text-xs uppercase tracking-[0.2em] text-gray-400 font-black">
                              Meditations
                            </div>
                            {meditations.length === 0 ? (
                              <p className="text-sm text-gray-500 font-serif font-black">No meditations saved yet.</p>
                            ) : (
                              <div className="min-w-0 space-y-3 lg:max-h-[520px] lg:overflow-y-auto lg:pr-2">
                                {meditations.map((meditation) => {
                                  const entryCount = meditationEntries.get(meditation.id)?.length ?? 0
                                  const isSelected = meditation.id === selectedMeditationId
                                  return (
                                    <button
                                      key={meditation.id}
                                      onClick={() => handleSelectMeditation(meditation.id)}
                                      className={cn(
                                        "w-full min-w-0 text-left rounded-xl border-[3px] px-4 py-3 transition-all font-serif",
                                        isSelected
                                          ? "border-stone-300 bg-white shadow-md text-gray-700"
                                          : "border-gray-300/60 bg-muted/60 text-gray-500 hover:bg-white",
                                      )}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                          <div className="text-sm font-black text-gray-700 truncate">
                                            {meditation.title}
                                          </div>
                                          <div className="text-[11px] uppercase tracking-[0.15em] text-gray-400 mt-1 font-black truncate">
                                            {entryCount > 0
                                              ? `${entryCount} entr${entryCount === 1 ? "y" : "ies"}`
                                              : "No entries yet"}
                                          </div>
                                        </div>
                                        <NotebookPen className="h-4 w-4 text-logo-rose-400 flex-shrink-0" />
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 space-y-5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0 w-full sm:w-auto sm:flex-1">
                                <div className="text-xs uppercase tracking-[0.2em] text-gray-400 font-black mb-2">
                                  Journal Entries
                                </div>
                                <div className="text-lg font-black text-gray-700 font-serif truncate">
                                  {selectedMeditation?.title ?? "Select a meditation"}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 hover:text-gray-700 flex-shrink-0"
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

                            {!selectedMeditation ? (
                              <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl text-sm text-gray-500 font-serif font-black">
                                Select a meditation to view or write your reflections.
                              </div>
                            ) : selectedMeditationEntries.length === 0 ? (
                              <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                                <BookOpenCheck className="mx-auto h-10 w-10 text-logo-emerald-400 mb-3" />
                                <p className="text-sm text-gray-500 font-serif font-black">
                                  No journal reflections for this meditation yet.
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={openNewEntryDialog}
                                  className="mt-2 text-gray-500 hover:text-gray-700"
                                >
                                  Add an entry
                                </Button>
                              </div>
                            ) : (
                              <div className="min-w-0 space-y-5">
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                  {selectedMeditationEntries.map((entry) => {
                                    const entryDate = new Date(entry.playedAt)
                                    const isActive = entry.id === activeMeditationEntry?.id
                                    return (
                                      <button
                                        key={entry.id}
                                        onClick={() => setActiveMeditationEntryId(entry.id)}
                                        className={cn(
                                          "min-w-0 rounded-xl border-[3px] px-4 py-3 text-left transition-all",
                                          isActive
                                            ? "border-stone-300 bg-white shadow-md text-gray-700"
                                            : "border-gray-300/60 bg-muted/60 text-gray-500 hover:bg-white",
                                        )}
                                      >
                                        <div className="text-[10px] uppercase tracking-[0.12em] text-gray-400 font-black mb-1 truncate">
                                          {formatShortDate(entryDate)}
                                        </div>
                                        <div className="text-sm font-black text-gray-700 mb-1">
                                          {formatTimeLabel(entryDate)}
                                        </div>
                                        <div className="text-xs text-gray-500 line-clamp-2 font-serif">
                                          {entry.note?.trim() ? entry.note : "Tap to add a reflection."}
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
                                        className="font-serif text-sm text-gray-600 bg-white/70"
                                      />
                                      {renderEntryActions(
                                        activeMeditationEntry,
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-gray-500 hover:text-gray-700"
                                          onClick={() => {
                                            const entryDateKey = getDateKey(new Date(activeMeditationEntry.playedAt))
                                            setActiveTab("date")
                                            setSelectedDateKey(entryDateKey)
                                            router.push(buildJournalHref({ date: entryDateKey }))
                                          }}
                                        >
                                          Jump to date
                                        </Button>,
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
            </div>
          </div>
        </div>
      </main>

      <Dialog
        open={entryPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setEntryPendingDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this journal entry?</DialogTitle>
            <DialogDescription>
              {entryPendingDelete
                ? `This will permanently remove your reflection for ${formatLongDate(
                    new Date(entryPendingDelete.playedAt),
                  )}. This action cannot be undone.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <DialogClose asChild>
              <Button variant="ghost" disabled={isDeletingEntry}>
                Cancel
              </Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeletingEntry}>
              {isDeletingEntry ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewEntryOpen} onOpenChange={setIsNewEntryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New journal entry</DialogTitle>
            <DialogDescription>
              Record a reflection for a meditation you&apos;ve practiced, on any date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-entry-meditation">Meditation</Label>
              <select
                id="new-entry-meditation"
                value={newEntryMeditationId}
                onChange={(event) => setNewEntryMeditationId(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-600"
              >
                {meditations.map((meditation) => (
                  <option key={meditation.id} value={meditation.id}>
                    {meditation.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-entry-date">Date</Label>
                <input
                  id="new-entry-date"
                  type="date"
                  value={newEntryDate}
                  onChange={(event) => setNewEntryDate(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-entry-time">Time</Label>
                <input
                  id="new-entry-time"
                  type="time"
                  value={newEntryTime}
                  onChange={(event) => setNewEntryTime(event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-600"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-entry-note">Reflection</Label>
              <Textarea
                id="new-entry-note"
                value={newEntryNote}
                onChange={(event) => setNewEntryNote(event.target.value)}
                rows={4}
                placeholder="What arose during this session?"
                className="font-serif text-sm text-gray-600"
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-end">
            <DialogClose asChild>
              <Button variant="ghost" disabled={isCreatingEntry}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleCreateEntry}
              disabled={isCreatingEntry || !newEntryMeditationId || !newEntryDate}
              className="bg-gradient-to-r from-logo-rose-300 to-logo-emerald-400 text-white font-black shadow-md hover:shadow-none disabled:opacity-40"
            >
              {isCreatingEntry ? "Adding..." : "Add entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

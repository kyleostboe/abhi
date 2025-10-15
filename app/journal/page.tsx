"use client"

import { useEffect, useState, useMemo } from "react"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { TEST_PROFILE_ID } from "@/lib/test-profile"
import { useToast } from "@/hooks/use-toast"
import { CalendarIcon, Music, Clock, Save, Trash2, Plus, BookOpen } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn, formatTime } from "@/lib/utils"
import { format, parseISO, startOfDay, isSameDay } from "date-fns"

interface JournalEntry {
  id: string
  profile_id: string
  meditation_id: string | null
  entry_date: string
  play_time: string | null
  content: string | null
  created_at: string
  updated_at: string
  meditation?: {
    id: string
    title: string
    duration: number
    audio_url: string
  }
}

interface Meditation {
  id: string
  title: string
  duration: number
  audio_url: string
  description: string | null
  created_at: string
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [meditations, setMeditations] = useState<Meditation[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedMeditationId, setSelectedMeditationId] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [newEntryContent, setNewEntryContent] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  const supabase = createClient()

  // Fetch journal entries
  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select(
          `
          *,
          meditation:meditations(id, title, duration, audio_url)
        `,
        )
        .eq("profile_id", TEST_PROFILE_ID)
        .order("entry_date", { ascending: false })

      if (error) throw error
      setEntries(data || [])
    } catch (error) {
      console.error("[v0] Error fetching journal entries:", error)
      toast({
        title: "Error",
        description: "Failed to load journal entries",
        variant: "destructive",
      })
    }
  }

  // Fetch meditations
  const fetchMeditations = async () => {
    try {
      const { data, error } = await supabase
        .from("meditations")
        .select("id, title, duration, audio_url, description, created_at")
        .eq("profile_id", TEST_PROFILE_ID)
        .order("created_at", { ascending: false })

      if (error) throw error
      setMeditations(data || [])
    } catch (error) {
      console.error("[v0] Error fetching meditations:", error)
      toast({
        title: "Error",
        description: "Failed to load meditations",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchEntries(), fetchMeditations()])
      setIsLoading(false)
    }
    loadData()
  }, [])

  // Filter entries by selected date
  const entriesForSelectedDate = useMemo(() => {
    return entries.filter((entry) => {
      const entryDate = parseISO(entry.entry_date)
      return isSameDay(entryDate, selectedDate)
    })
  }, [entries, selectedDate])

  // Filter entries by selected meditation
  const entriesForSelectedMeditation = useMemo(() => {
    if (!selectedMeditationId) return []
    return entries.filter((entry) => entry.meditation_id === selectedMeditationId)
  }, [entries, selectedMeditationId])

  // Get dates with entries for calendar highlighting
  const datesWithEntries = useMemo(() => {
    return entries.map((entry) => startOfDay(parseISO(entry.entry_date)))
  }, [entries])

  // Save or update journal entry
  const saveEntry = async () => {
    if (!newEntryContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter some content for your journal entry",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      if (editingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from("journal_entries")
          .update({
            content: newEntryContent,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingEntry.id)

        if (error) throw error

        toast({
          title: "Success",
          description: "Journal entry updated",
        })
      } else {
        // Create new entry
        const { error } = await supabase.from("journal_entries").insert({
          profile_id: TEST_PROFILE_ID,
          meditation_id: selectedMeditationId,
          entry_date: format(selectedDate, "yyyy-MM-dd"),
          play_time: new Date().toISOString(),
          content: newEntryContent,
        })

        if (error) throw error

        toast({
          title: "Success",
          description: "Journal entry created",
        })
      }

      setNewEntryContent("")
      setEditingEntry(null)
      setIsDialogOpen(false)
      await fetchEntries()
    } catch (error) {
      console.error("[v0] Error saving journal entry:", error)
      toast({
        title: "Error",
        description: "Failed to save journal entry",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Delete journal entry
  const deleteEntry = async (entryId: string) => {
    try {
      const { error } = await supabase.from("journal_entries").delete().eq("id", entryId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Journal entry deleted",
      })

      await fetchEntries()
    } catch (error) {
      console.error("[v0] Error deleting journal entry:", error)
      toast({
        title: "Error",
        description: "Failed to delete journal entry",
        variant: "destructive",
      })
    }
  }

  // Open dialog for new entry
  const openNewEntryDialog = () => {
    setEditingEntry(null)
    setNewEntryContent("")
    setIsDialogOpen(true)
  }

  // Open dialog for editing entry
  const openEditEntryDialog = (entry: JournalEntry) => {
    setEditingEntry(entry)
    setNewEntryContent(entry.content || "")
    setIsDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-logo-rose-50 via-white to-logo-emerald-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500 font-serif font-black">Loading journal...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-logo-rose-50 via-white to-logo-emerald-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <h1 className="text-4xl font-black font-serif text-gray-800 mb-2 flex items-center justify-center gap-3">
            <BookOpen className="h-8 w-8 text-logo-rose-500" />
            Meditation Journal
          </h1>
          <p className="text-gray-600 font-serif">Track your meditation practice and reflections</p>
        </motion.div>

        <Tabs defaultValue="by-date" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="by-date" className="font-serif font-black">
              <CalendarIcon className="h-4 w-4 mr-2" />
              By Date
            </TabsTrigger>
            <TabsTrigger value="by-meditation" className="font-serif font-black">
              <Music className="h-4 w-4 mr-2" />
              By Meditation
            </TabsTrigger>
          </TabsList>

          {/* By Date View */}
          <TabsContent value="by-date" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Calendar */}
              <Card className="p-6 bg-white shadow-lg border-2 border-muted">
                <h3 className="font-black font-serif text-gray-700 mb-4 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Select Date
                </h3>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border-0"
                  modifiers={{
                    hasEntry: datesWithEntries,
                  }}
                  modifiersStyles={{
                    hasEntry: {
                      fontWeight: "bold",
                      textDecoration: "underline",
                      color: "#059669",
                    },
                  }}
                />
                <div className="mt-4 text-xs text-gray-500 font-serif">Dates with entries are underlined in green</div>
              </Card>

              {/* Entries for selected date */}
              <Card className="p-6 bg-white shadow-lg border-2 border-muted">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black font-serif text-gray-700 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {format(selectedDate, "MMMM d, yyyy")}
                  </h3>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        onClick={openNewEntryDialog}
                        className="bg-gradient-to-r from-logo-rose-400 to-logo-emerald-500 text-white font-serif font-black"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        New Entry
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="font-serif font-black">
                          {editingEntry ? "Edit Journal Entry" : "New Journal Entry"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-serif font-black text-gray-700 mb-2 block">
                            Date: {format(selectedDate, "MMMM d, yyyy")}
                          </label>
                        </div>
                        <div>
                          <label className="text-sm font-serif font-black text-gray-700 mb-2 block">
                            Meditation (optional)
                          </label>
                          <select
                            value={selectedMeditationId || ""}
                            onChange={(e) => setSelectedMeditationId(e.target.value || null)}
                            className="w-full p-2 border-2 border-muted rounded-sm font-serif"
                          >
                            <option value="">No meditation selected</option>
                            {meditations.map((med) => (
                              <option key={med.id} value={med.id}>
                                {med.title} ({formatTime(med.duration)})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-serif font-black text-gray-700 mb-2 block">
                            Your Reflection
                          </label>
                          <Textarea
                            value={newEntryContent}
                            onChange={(e) => setNewEntryContent(e.target.value)}
                            placeholder="How was your meditation today? What did you notice?"
                            className="min-h-[200px] font-serif border-2 border-muted"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            className="font-serif font-black"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={saveEntry}
                            disabled={isSaving}
                            className="bg-gradient-to-r from-logo-rose-400 to-logo-emerald-500 text-white font-serif font-black"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? "Saving..." : "Save Entry"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  <AnimatePresence>
                    {entriesForSelectedDate.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12 text-gray-500 font-serif"
                      >
                        <p>No entries for this date</p>
                        <p className="text-sm mt-2">Click "New Entry" to add one</p>
                      </motion.div>
                    ) : (
                      entriesForSelectedDate.map((entry, index) => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="p-4 bg-gradient-to-br from-white to-gray-50 border-2 border-muted">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                {entry.meditation && (
                                  <Badge
                                    variant="outline"
                                    className="mb-2 bg-gradient-to-r from-logo-rose-100 to-logo-emerald-100 border-none"
                                  >
                                    <Music className="h-3 w-3 mr-1" />
                                    {entry.meditation.title}
                                  </Badge>
                                )}
                                {entry.play_time && (
                                  <div className="text-xs text-gray-500 font-serif mb-2">
                                    {format(parseISO(entry.play_time), "h:mm a")}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditEntryDialog(entry)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Save className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteEntry(entry.id)}
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 font-serif whitespace-pre-wrap">{entry.content}</p>
                          </Card>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* By Meditation View */}
          <TabsContent value="by-meditation" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Meditation List */}
              <Card className="p-6 bg-white shadow-lg border-2 border-muted md:col-span-1">
                <h3 className="font-black font-serif text-gray-700 mb-4 flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Your Meditations
                </h3>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {meditations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 font-serif text-sm">No meditations yet</div>
                  ) : (
                    meditations.map((meditation) => {
                      const entryCount = entries.filter((e) => e.meditation_id === meditation.id).length
                      return (
                        <button
                          key={meditation.id}
                          onClick={() => setSelectedMeditationId(meditation.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-sm border-2 transition-all font-serif",
                            selectedMeditationId === meditation.id
                              ? "bg-gradient-to-r from-logo-rose-100 to-logo-emerald-100 border-logo-teal-300"
                              : "bg-white border-muted hover:border-gray-300",
                          )}
                        >
                          <div className="font-black text-gray-800 text-sm mb-1">{meditation.title}</div>
                          <div className="text-xs text-gray-500 flex items-center justify-between">
                            <span>{formatTime(meditation.duration)}</span>
                            <Badge variant="outline" className="text-xs">
                              {entryCount} {entryCount === 1 ? "entry" : "entries"}
                            </Badge>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </Card>

              {/* Entries for selected meditation */}
              <Card className="p-6 bg-white shadow-lg border-2 border-muted md:col-span-2">
                <h3 className="font-black font-serif text-gray-700 mb-4">
                  {selectedMeditationId
                    ? `Entries for ${meditations.find((m) => m.id === selectedMeditationId)?.title}`
                    : "Select a meditation"}
                </h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  <AnimatePresence>
                    {!selectedMeditationId ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12 text-gray-500 font-serif"
                      >
                        Select a meditation to view its journal entries
                      </motion.div>
                    ) : entriesForSelectedMeditation.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12 text-gray-500 font-serif"
                      >
                        No entries for this meditation yet
                      </motion.div>
                    ) : (
                      entriesForSelectedMeditation.map((entry, index) => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="p-4 bg-gradient-to-br from-white to-gray-50 border-2 border-muted">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="text-sm font-black text-gray-700 mb-1">
                                  {format(parseISO(entry.entry_date), "MMMM d, yyyy")}
                                </div>
                                {entry.play_time && (
                                  <div className="text-xs text-gray-500 font-serif">
                                    {format(parseISO(entry.play_time), "h:mm a")}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditEntryDialog(entry)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Save className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteEntry(entry.id)}
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 font-serif whitespace-pre-wrap">{entry.content}</p>
                          </Card>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

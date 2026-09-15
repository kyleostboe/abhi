"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  FolderPlus,
  MoreHorizontal,
  MoreVertical,
  PenLine,
  Plus,
  Search,
} from "lucide-react"

import { usePersistedChoice, usePersistedFlag, usePersistedValue } from "@/hooks/use-persisted-choice"
import { TimerTool } from "@/components/timer-tool"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { useJournalNotes, type JournalNote } from "@/hooks/use-journal-notes"
import { MeditationLibrary, type SavedMeditation } from "@/lib/meditation-library"
import { NoteEditor, fontClassFor, type NoteEditorHandle } from "@/components/journal/note-editor"
import { NoteToolbar, useVoiceRecorder } from "@/components/journal/note-toolbar"
import { MeditationPicker, QuotePicker } from "@/components/journal/note-pickers"
import { SessionsView } from "@/components/journal/sessions-view"
import { useSessions } from "@/hooks/use-sessions"
import { useUserSettings } from "@/hooks/use-user-settings"
import { PracticeSummary } from "@/components/journal/practice-summary"
import { type SessionNoteDraft, draftHasContent, draftSubtitle, draftTitle } from "@/lib/journal-draft"
import { clearSessionNoteDraft, getSessionNoteDraft } from "@/lib/storage/session-note-draft"
import { JournalRefProvider } from "@/components/journal/journal-refs"
import {
  AttachmentsNotIncludedError,
  compressImage,
  encodeVoiceNote,
  saveAttachment,
} from "@/lib/journal-attachments"
import { slugify } from "@/lib/journal-markdown"
import { cn } from "@/lib/utils"
import { log } from "@/lib/log"

const ALL_NOTES = "__all__"
const UNFILED = "__unfiled__"

const formatListDate = (iso: string) => {
  const date = new Date(iso)
  const today = new Date()
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  return sameDay
    ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date)
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)
}

const formatFullDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))

export function JournalScreen() {
  const {
    notes,
    folders,
    isLoading,
    loadNoteBody,
    createNote,
    updateNote,
    deleteNote,
    createFolder,
    renameFolder,
    deleteFolder,
  } = useJournalNotes()
  const { isAuthenticated, login, userId } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  const { sessions, isLoading: isLoadingSessions } = useSessions()
  const { settings } = useUserSettings()

  const [meditations, setMeditations] = useState<SavedMeditation[]>([])
  const [activeTab, setActiveTab] = usePersistedChoice("journal-tab", ["notes", "sessions"] as const, "notes")
  const [timerOpen, setTimerOpen] = usePersistedFlag("journal-timer")
  // Where you were, kept across a navigation — swiping is touch-only, so the two-pane mobile
  // layout is the only one a swiper ever sees, and coming back to the list every time meant a
  // swipe out and back lost the note you were reading. Same module-memory-plus-subscribers
  // mechanism as the tab above; the ids are validated against the loaded notes below, since a
  // note deleted on another device must not wedge the pane on something that is not there.
  const [activeFolderId, setActiveFolderId] = usePersistedValue<string>(
    "journal-folder",
    (raw) => raw || ALL_NOTES,
    ALL_NOTES,
  )
  const [activeNoteId, setActiveNoteId] = usePersistedValue<string | null>(
    "journal-note",
    (raw) => raw || null,
    null,
  )
  const [search, setSearch] = useState("")
  const [mobilePane, setMobilePane] = usePersistedChoice("journal-pane", ["list", "note"] as const, "list")
  const [isBusy, setIsBusy] = useState(false)
  const [showMeditationPicker, setShowMeditationPicker] = useState(false)
  const [showQuotePicker, setShowQuotePicker] = useState(false)
  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [folderName, setFolderName] = useState("")
  const [notePendingDelete, setNotePendingDelete] = useState<JournalNote | null>(null)
  const [showNoteMenu, setShowNoteMenu] = useState(false)
  /** Which list card's ⋮ menu is open, if any. One at a time, and the id rather than a boolean
   * because the menu belongs to the card rather than to the pane. */
  const [cardMenuId, setCardMenuId] = useState<string | null>(null)

  // The sit that just finished, offered as a note but not yet written as one. It becomes a real
  // note on the first save — see handleSave — so declining it costs nothing and leaves nothing.
  const [pendingDraft, setPendingDraft] = useState<SessionNoteDraft | null>(null)

  const editorHandle = useRef<NoteEditorHandle | null>(null)
  const [editorInstanceKey, setEditorInstanceKey] = useState(0)
  const recorder = useVoiceRecorder()

  useEffect(() => {
    let mounted = true
    MeditationLibrary.getAllMeditations()
      .then((all) => mounted && setMeditations(all))
      .catch((error) => log.error("Unable to load meditations", error))
    return () => {
      mounted = false
    }
  }, [isAuthenticated])

  // A restored position has to still exist. A note deleted here on another device, or a folder
  // removed since, would otherwise leave the pane pointing at nothing — so the restore is checked
  // against the notes that actually loaded, and falls back to the list.
  useEffect(() => {
    if (isLoading) return
    if (activeNoteId !== null && !notes.some((note) => note.id === activeNoteId)) {
      setActiveNoteId(null)
      setMobilePane("list")
    }
    if (
      activeFolderId !== ALL_NOTES &&
      activeFolderId !== UNFILED &&
      !folders.some((folder) => folder.id === activeFolderId)
    ) {
      setActiveFolderId(ALL_NOTES)
    }
  }, [isLoading, notes, folders, activeNoteId, activeFolderId, setActiveNoteId, setActiveFolderId, setMobilePane])

  useEffect(() => {
    if (!isAuthenticated) return
    const draft = getSessionNoteDraft()
    if (!draft) return

    // Already written about — the offer is spent.
    if (notes.some((note) => note.sessionId === draft.sessionId)) {
      clearSessionNoteDraft()
      return
    }

    setPendingDraft(draft)
  }, [isAuthenticated, notes])

  // Deep link: /journal?note=<id>
  useEffect(() => {
    const noteParam = searchParams.get("note")
    if (noteParam) {
      setActiveNoteId(noteParam)
      setMobilePane("note")
    }
  }, [searchParams])

  const visibleNotes = useMemo(() => {
    const query = search.trim().toLowerCase()
    return notes.filter((note) => {
      if (activeFolderId === UNFILED && note.folderId !== null) return false
      if (activeFolderId !== ALL_NOTES && activeFolderId !== UNFILED && note.folderId !== activeFolderId) return false
      if (!query) return true
      return `${note.title} ${note.preview} ${note.meditationTitle ?? ""}`.toLowerCase().includes(query)
    })
  }, [notes, activeFolderId, search])

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) ?? null,
    [notes, activeNoteId],
  )

  // Keep a note selected on desktop so the document pane is never empty for no reason — except
  // while a draft is being offered, which owns the pane until it is written or dismissed.
  useEffect(() => {
    if (pendingDraft) return
    if (activeNoteId && notes.some((note) => note.id === activeNoteId)) return
    setActiveNoteId(visibleNotes[0]?.id ?? null)
  }, [visibleNotes, activeNoteId, notes, pendingDraft])

  // Note bodies live as files in storage, so the one being opened is fetched on demand; the
  // list itself runs entirely off the index.
  useEffect(() => {
    if (!activeNoteId) return
    const note = notes.find((item) => item.id === activeNoteId)
    if (!note || note.isBodyLoaded) return
    void loadNoteBody(activeNoteId).then((body) => {
      if (body !== null) setEditorInstanceKey((key) => key + 1)
    })
  }, [activeNoteId, notes, loadNoteBody])

  const handleSave = useCallback(
    async (markdown: string) => {
      // An offered draft becomes a note the moment something is actually written into it, and
      // not before. An untouched draft leaves no row behind, which is the whole point of it
      // being a draft rather than a note created when the sit ended.
      if (pendingDraft) {
        if (!draftHasContent(markdown)) return true

        // contentMd is passed here so the note's title and slug derive from what was actually
        // written; the updateNote below is what pushes the body to storage.
        const note = await createNote({
          folderId: null,
          contentMd: markdown,
          sessionId: pendingDraft.sessionId,
          meditationId: pendingDraft.meditationId,
          meditationTitle: pendingDraft.meditationTitle,
          playedAt: new Date(pendingDraft.startedAt),
        })

        if (!note) {
          toast({ title: "Couldn't save this note", description: "Please try again.", variant: "destructive" })
          return false
        }

        clearSessionNoteDraft()
        setPendingDraft(null)
        setActiveNoteId(note.id)
        return updateNote(note.id, { contentMd: markdown })
      }

      if (!activeNoteId) return false
      return updateNote(activeNoteId, { contentMd: markdown })
    },
    [activeNoteId, updateNote, pendingDraft, createNote, toast],
  )

  const dismissDraft = useCallback(() => {
    clearSessionNoteDraft()
    setPendingDraft(null)
  }, [])

  const handleNewNote = async () => {
    const folderId = activeFolderId === ALL_NOTES || activeFolderId === UNFILED ? null : activeFolderId
    const note = await createNote({ folderId })
    if (!note) {
      toast({ title: "Couldn't create the note", description: "Please try again.", variant: "destructive" })
      return
    }
    setActiveNoteId(note.id)
    setMobilePane("note")
    setEditorInstanceKey((key) => key + 1)
  }

  const requireNote = async (): Promise<string | null> => {
    if (activeNoteId) return activeNoteId
    const note = await createNote({ folderId: null })
    if (note) {
      setActiveNoteId(note.id)
      setMobilePane("note")
      return note.id
    }
    return null
  }

  const handleImage = async (file: File) => {
    const noteId = await requireNote()
    if (!noteId || !userId) return
    setIsBusy(true)
    try {
      const { blob, width, height, mime } = await compressImage(file)
      const attachment = await saveAttachment({
        blob,
        kind: "image",
        ext: mime === "image/png" ? "png" : "jpg",
        mime,
        displayName: file.name,
        entryId: noteId,
        profileId: userId,
        width,
        height,
      })
      editorHandle.current?.insertAttachment(attachment.filename, "image")
    } catch (error) {
      // A refused attachment is not a failed one. "Please try again" against a plan limit is
      // advice that cannot work, and following it is how a limit reads as a broken app.
      if (error instanceof AttachmentsNotIncludedError) {
        toast({ title: "Images need a subscription", description: error.message })
      } else {
        log.error("[journal] Image attach failed:", error)
        toast({ title: "Couldn't add the image", description: "Please try again.", variant: "destructive" })
      }
    } finally {
      setIsBusy(false)
    }
  }

  const handleVoice = async () => {
    if (recorder.isRecording) {
      setIsBusy(true)
      try {
        const recorded = await recorder.stop()
        if (!recorded) return
        const noteId = await requireNote()
        if (!noteId || !userId) return
        const { blob, ext, mime, durationMs } = await encodeVoiceNote(recorded)
        const attachment = await saveAttachment({
          blob,
          kind: "audio",
          ext,
          mime,
          displayName: `voice-${new Date().toISOString().slice(0, 10)}`,
          entryId: noteId,
          profileId: userId,
          durationMs,
        })
        editorHandle.current?.insertAttachment(attachment.filename, "audio")
      } catch (error) {
        if (error instanceof AttachmentsNotIncludedError) {
          toast({ title: "Voice notes need a subscription", description: error.message })
        } else {
          log.error("[journal] Voice note failed:", error)
          toast({ title: "Couldn't save the voice note", description: "Please try again.", variant: "destructive" })
        }
      } finally {
        setIsBusy(false)
      }
      return
    }

    const started = await recorder.start()
    if (!started) {
      toast({
        title: "Microphone unavailable",
        description: "Allow microphone access to record a voice note.",
        variant: "destructive",
      })
    }
  }

  const activeFolderName =
    activeFolderId === ALL_NOTES
      ? "All Notes"
      : activeFolderId === UNFILED
        ? "Unfiled"
        : (folders.find((folder) => folder.id === activeFolderId)?.name ?? "Notes")

  const folderRow = (id: string, name: string, count: number) => (
    <button
      key={id}
      type="button"
      onClick={() => {
        setActiveFolderId(id)
        setMobilePane("list")
      }}
      className={cn(
        "flex w-full min-w-0 items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-left transition-colors",
        // Same selected-pill treatment as the nav's active tab and the Timer's pill selectors,
        // rather than a plain white highlight that reads as "hovered" more than "chosen."
        activeFolderId === id
          ? "bg-gradient-to-r from-gray-600 to-gray-500 shadow-sm"
          : "hover:bg-white/60",
      )}
    >
      <span
        className={cn(
          "truncate text-sm font-black",
          activeFolderId === id ? "text-white" : "text-gray-700",
        )}
      >
        {name}
      </span>
      <span
        className={cn(
          "flex-shrink-0 text-[11px] font-black",
          activeFolderId === id ? "text-white/70" : "text-gray-400",
        )}
      >
        {count}
      </span>
    </button>
  )

  const meditationRefs = useMemo(
    () =>
      meditations.map((meditation) => ({
        id: meditation.id,
        title: meditation.title,
        slug: slugify(meditation.title, meditation.id.replace(/-/g, "")),
      })),
    [meditations],
  )
  const noteRefs = useMemo(() => notes.map((note) => ({ slug: note.slug, title: note.title })), [notes])

  return (
    <JournalRefProvider meditations={meditationRefs} notes={noteRefs}>
    <>
            {/* Signed out: a blank version of the same card rather than a blurred overlay, so
                the page still runs edge-to-edge and top-to-top on a phone. */}
            {!isAuthenticated ? (
              <div className="relative overflow-hidden font-serif">
                <div className="relative flex min-h-[70vh] flex-col items-center justify-center px-6 pb-10 pt-24 text-center md:pt-14">
                  <p className="text-lg font-black text-gray-700">Create account to use Journal</p>
                </div>
              </div>
            ) : (
            <>
            {/* The header and its switch are the layout's now (components/page-chrome.tsx), which
                is what lets them hold still across a swipe. Only the content below them is the
                page's. */}

            {/* The Timer replaces the page's own content rather than navigating anywhere, so the
                tab you had open is still there when you close it again. */}
            {timerOpen ? (
              <div className="px-4 pb-10 sm:px-8 lg:px-12 pt-[8px]">
                <TimerTool />
              </div>
            ) : activeTab === "sessions" ? (
              <>
                {sessions.length > 0 ? (
                  <PracticeSummary sessions={sessions} dayBoundaryHour={settings.dayBoundaryHour} />
                ) : null}
                <SessionsView
                  sessions={sessions}
                  notes={notes}
                  dayBoundaryHour={settings.dayBoundaryHour}
                  isLoading={isLoading || isLoadingSessions}
                  onOpenNote={(noteId) => {
                    setActiveTab("notes")
                    setActiveNoteId(noteId)
                    setMobilePane("note")
                    setEditorInstanceKey((key) => key + 1)
                  }}
                />
              </>
            ) : (
            <div className="grid min-h-[70vh] w-full min-w-0 grid-cols-1 font-serif md:grid-cols-[200px_minmax(0,280px)_minmax(0,1fr)]">
              {/* `font-serif` sits on this grid rather than on each of the fifteen elements
                  inside it. Setting it per element is how the note list and the practice log
                  drifted into the body font in the first place — one new element written without
                  the class and it is out. Form controls inherit it too, since Preflight gives
                  button/input/textarea `font: inherit`. */}
              {/* Folders */}
              <aside
                className={cn(
                  "min-w-0 border-muted bg-muted/30 p-3 md:block md:border-r",
                  mobilePane === "list" ? "block" : "hidden",
                  "md:pt-6",
                )}
              >
                <div className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
                  Folders
                </div>
                <div className="space-y-0.5">
                  {folderRow(ALL_NOTES, "All Notes", notes.length)}
                  {folderRow(UNFILED, "Unfiled", notes.filter((note) => !note.folderId).length)}
                  {folders.map((folder) =>
                    folderRow(folder.id, folder.name, notes.filter((note) => note.folderId === folder.id).length),
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFolderName("")
                    setShowFolderDialog(true)
                  }}
                  className="mt-2 flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-xs font-black tracking-tight text-gray-500 transition-colors hover:bg-white/60 hover:text-gray-700"
                >
                  <FolderPlus className="h-4 w-4" />
                  New folder
                </button>
              </aside>

              {/* Note list */}
              <section
                className={cn(
                  "min-w-0 border-muted p-3 md:block md:border-r md:pt-6",
                  mobilePane === "list" ? "block" : "hidden",
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-2 px-1">
                  <div className="min-w-0 truncate text-sm font-black text-gray-700">
                    {activeFolderName}
                  </div>
                  <button
                    type="button"
                    onClick={handleNewNote}
                    className="flex flex-shrink-0 items-center gap-1 rounded-[10px] px-2 py-1 text-xs font-black tracking-tight text-gray-500 transition-colors hover:bg-white/60 hover:text-gray-700"
                  >
                    <Plus className="h-4 w-4" />
                    New
                  </button>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search notes"
                    className="flex w-full ring-offset-background file:border-0 file:bg-white file:text-xs file:font-medium file:text-foreground placeholder:text-gray-500 focus-visible:outline-none disabled:cursor-not-allowed md:text-xs rounded-[10px] bg-white py-4 pr-4 pl-8 text-xs font-black text-gray-600 inset-shadow-recess h-9 border-[#f2f2f2] border-[0px]"
                  />
                </div>

                {/* Every note is a card, not just the open one. It used to be that only the
                    selected note had a white background, which read as "the others are not really
                    there" rather than as a selection — and a note and a saved meditation are the
                    same kind of object in this app, so the card is the Library's, item for item:
                    `rounded-xl border-[3px] border-recess bg-white shadow-md`. Being open is now
                    said by the border alone, which is also how the practice log says it. */}
                <div className="space-y-2 md:max-h-[62vh] md:overflow-y-auto md:pr-1">
                  {isLoading ? (
                    [0, 1, 2].map((index) => (
                      <div
                        key={index}
                        className="animate-pulse rounded-xl border-[3px] border-recess p-3 shadow-md"
                      >
                        <div className="mb-2 h-3 w-32 rounded bg-muted" />
                        <div className="h-3 w-20 rounded bg-muted/70" />
                      </div>
                    ))
                  ) : visibleNotes.length === 0 ? (
                    <div className="px-2 py-10 text-center">
                      <p className="text-sm font-black text-gray-500">
                        {search ? "No matching notes" : "No notes yet"}
                      </p>
                    </div>
                  ) : (
                    visibleNotes.map((note) => (
                      <div
                        key={note.id}
                        className={cn(
                          "relative min-w-0 rounded-xl border-[3px] bg-white shadow-md transition-colors",
                          note.id === activeNoteId ? "border-stone-300" : "border-recess hover:border-stone-300",
                        )}
                      >
                        {/* Opening the note is the card. The ⋮ has to be a sibling rather than a
                            child: a button inside a button is invalid, and the inner one would
                            never get a click of its own. `pr-7` keeps the title clear of it. */}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveNoteId(note.id)
                            setMobilePane("note")
                            setEditorInstanceKey((key) => key + 1)
                          }}
                          className="block w-full min-w-0 rounded-xl p-3 pr-7 text-left"
                        >
                          <div className="truncate text-sm font-black text-gray-800">{note.title}</div>
                          <div className="mt-1.5 truncate text-xs font-black tracking-tight text-gray-500">
                            {note.preview || "No additional text"}
                          </div>
                        </button>

                        <div className="absolute right-2 top-2">
                          <button
                            type="button"
                            aria-label="Note details"
                            aria-expanded={cardMenuId === note.id}
                            onClick={() => setCardMenuId((open) => (open === note.id ? null : note.id))}
                            className="rounded-[8px] p-1.5 text-gray-400 transition-colors hover:bg-muted hover:text-gray-600"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {cardMenuId === note.id && (
                            <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-[10px] border-none bg-white p-2 shadow-2xl">
                              {/* The card keeps the title and the first line, and nothing else.
                                  What used to sit under them — the meditation it came from, and
                                  both dates — is here instead, which is what buys the room back. */}
                              {note.meditationTitle ? (
                                <div className="pb-1.5">
                                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                                    Meditation
                                  </div>
                                  <div className="mt-0.5 truncate text-xs font-black tracking-tight text-gray-600">
                                    {note.meditationTitle}
                                  </div>
                                </div>
                              ) : null}
                              <div className="pb-1.5">
                                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                                  Written
                                </div>
                                <div className="mt-0.5 flex items-center gap-1 text-xs font-black tracking-tight text-gray-600">
                                  <CalendarDays className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                                  {formatListDate(note.playedAt)}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                                  Last edited
                                </div>
                                <div className="mt-0.5 flex items-center gap-1 text-xs font-black tracking-tight text-gray-600">
                                  <PenLine className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                                  {formatListDate(note.updatedAt)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Document */}
              <section className={cn("min-w-0 p-4 md:block md:p-8", mobilePane === "note" ? "block" : "hidden")}>
                {pendingDraft ? (
                  <div className="min-w-0">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black tracking-tight text-gray-700">
                          {draftTitle(pendingDraft)}
                        </p>
                        <p className="mt-0.5 text-[11px] tracking-tight text-gray-400">
                          {draftSubtitle(pendingDraft)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={dismissDraft}
                        className="flex-shrink-0 text-[11px] font-black tracking-tight text-gray-400 hover:text-gray-600"
                      >
                        Not now
                      </button>
                    </div>

                    {/* Nothing is written until something is typed — see handleSave. */}
                    <NoteEditor
                      key={`draft-${pendingDraft.sessionId}`}
                      noteId={`draft-${pendingDraft.sessionId}`}
                      initialMarkdown=""
                      font={null}
                      onSave={handleSave}
                      onReady={(handle) => {
                        editorHandle.current = handle
                      }}
                    />
                  </div>
                ) : activeNote ? (
                  <div className="min-w-0">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setMobilePane("list")}
                        className="flex items-center gap-1 text-xs font-black text-gray-500 md:hidden"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Notes
                      </button>
                      <div className="hidden items-center gap-1.5 text-[11px] font-black text-gray-400 md:flex">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatFullDate(activeNote.playedAt)}
                      </div>
                      <div className="relative">
                        <button
                          type="button"
                          aria-label="Note actions"
                          onClick={() => setShowNoteMenu((open) => !open)}
                          className="rounded-[8px] p-2 text-gray-500 transition-colors hover:bg-muted hover:text-gray-700"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {showNoteMenu && (
                          <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-[10px] border-none bg-white p-1 shadow-2xl">
                            <div className="px-2 pb-1 pt-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                              Move to folder
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                void updateNote(activeNote.id, { folderId: null })
                                setShowNoteMenu(false)
                              }}
                              className="block w-full rounded px-2 py-1.5 text-left text-xs text-gray-600 hover:bg-muted"
                            >
                              Unfiled
                            </button>
                            {folders.map((folder) => (
                              <button
                                key={folder.id}
                                type="button"
                                onClick={() => {
                                  void updateNote(activeNote.id, { folderId: folder.id })
                                  setShowNoteMenu(false)
                                }}
                                className={cn(
                                  "block w-full truncate rounded px-2 py-1.5 text-left text-xs hover:bg-muted",
                                  activeNote.folderId === folder.id ? "font-black text-gray-800" : "text-gray-600",
                                )}
                              >
                                {folder.name}
                              </button>
                            ))}
                            {activeNote.meditationId && (
                              <button
                                type="button"
                                onClick={() => router.push(`/library?meditation=${activeNote.meditationId}`)}
                                className="mt-1 block w-full rounded border-t border-muted px-2 py-1.5 text-left text-xs text-gray-600 hover:bg-muted"
                              >
                                Open in Library
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setNotePendingDelete(activeNote)
                                setShowNoteMenu(false)
                              }}
                              className="mt-1 block w-full rounded border-t border-muted px-2 py-1.5 text-left text-xs text-destructive hover:bg-muted"
                            >
                              Delete note
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <NoteToolbarBridge
                      key={`toolbar-${activeNote.id}-${editorInstanceKey}`}
                      note={activeNote}
                      isBusy={isBusy}
                      isRecording={recorder.isRecording}
                      onFontChange={(font) => void updateNote(activeNote.id, { font })}
                      onPickImage={handleImage}
                      onRecordVoice={handleVoice}
                      onPickMeditation={() => setShowMeditationPicker(true)}
                      onPickQuote={() => setShowQuotePicker(true)}
                      onSave={handleSave}
                      onReady={(handle) => {
                        editorHandle.current = handle
                      }}
                      editorKey={editorInstanceKey}
                    />
                  </div>
                ) : (
                  <div className="flex h-full min-h-[40vh] flex-col items-center justify-center text-center">
                    <p className="text-sm font-black text-gray-500">
                      Select a note, or start a new one.
                    </p>
                  </div>
                )}
              </section>
            </div>
            )}
            </>
            )}

      <MeditationPicker
        open={showMeditationPicker}
        onOpenChange={setShowMeditationPicker}
        meditations={meditations}
        onPick={({ slug, title, meditationId }) =>
          editorHandle.current?.insertMeditation({ slug, title, meditationId })
        }
      />

      <QuotePicker
        open={showQuotePicker}
        onOpenChange={setShowQuotePicker}
        notes={notes}
        currentNoteId={activeNoteId}
        onPick={({ text, noteSlug, noteTitle }) => editorHandle.current?.insertQuote({ text, noteSlug, noteTitle })}
      />

      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>Group notes by practice type, retreat, or anything else.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="folder-name">Name</Label>
            <input
              id="folder-name"
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="Metta"
              className="h-[38px] w-full rounded-sm border-0 bg-white px-4 text-xs text-gray-700 shadow-2xl outline-none placeholder:text-gray-500"
            />
          </div>
          <DialogFooter className="sm:justify-end">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              disabled={!folderName.trim()}
              onClick={async () => {
                const folder = await createFolder(folderName)
                if (folder) setActiveFolderId(folder.id)
                setShowFolderDialog(false)
              }}
              variant="accent"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={notePendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setNotePendingDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this note?</DialogTitle>
            <DialogDescription>
              {notePendingDelete
                ? `"${notePendingDelete.title}" will be permanently removed. This cannot be undone.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!notePendingDelete) return
                const ok = await deleteNote(notePendingDelete.id)
                setNotePendingDelete(null)
                if (ok) {
                  setActiveNoteId(null)
                  setMobilePane("list")
                  toast({ title: "Note deleted" })
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
    </JournalRefProvider>
  )
}

/**
 * Holds the toolbar and the editor together so the toolbar can act on the live editor instance
 * without the page having to own editor state.
 */
function NoteToolbarBridge({
  note,
  isBusy,
  isRecording,
  onFontChange,
  onPickImage,
  onRecordVoice,
  onPickMeditation,
  onPickQuote,
  onSave,
  onReady,
  editorKey,
}: {
  note: JournalNote
  isBusy: boolean
  isRecording: boolean
  onFontChange: (font: string | null) => void
  onPickImage: (file: File) => void
  onRecordVoice: () => void
  onPickMeditation: () => void
  onPickQuote: () => void
  onSave: (markdown: string) => Promise<boolean>
  onReady: (handle: NoteEditorHandle) => void
  editorKey: number
}) {
  const [editorInstance, setEditorInstance] = useState<Parameters<typeof NoteToolbar>[0]["editor"]>(null)

  return (
    <div className="min-w-0">
      <NoteToolbar
        editor={editorInstance}
        font={note.font}
        onFontChange={onFontChange}
        onPickImage={onPickImage}
        onRecordVoice={onRecordVoice}
        onPickMeditation={onPickMeditation}
        onPickQuote={onPickQuote}
        isRecording={isRecording}
        isBusy={isBusy}
      />
      <div className={cn("pt-5", fontClassFor(note.font))}>
        <NoteEditor
          key={`${note.id}-${editorKey}`}
          noteId={note.id}
          initialMarkdown={note.contentMd}
          font={note.font}
          onSave={onSave}
          onReady={(handle) => {
            onReady(handle)
            setEditorInstance(handle.getEditor())
          }}
        />
      </div>
    </div>
  )
}

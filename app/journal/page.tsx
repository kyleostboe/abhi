"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  FolderPlus,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Search,
} from "lucide-react"

import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { useJournalNotes, type JournalNote } from "@/hooks/use-journal-notes"
import { MeditationLibrary, type SavedMeditation } from "@/lib/meditation-library"
import { NoteEditor, fontClassFor, type NoteEditorHandle } from "@/components/journal/note-editor"
import { NoteToolbar, useVoiceRecorder } from "@/components/journal/note-toolbar"
import { MeditationPicker, QuotePicker } from "@/components/journal/note-pickers"
import { JournalRefProvider } from "@/components/journal/journal-refs"
import { compressImage, encodeVoiceNote, saveAttachment } from "@/lib/journal-attachments"
import { slugify } from "@/lib/journal-markdown"
import { cn } from "@/lib/utils"

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

export default function JournalPage() {
  const {
    notes,
    folders,
    isLoading,
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

  const [meditations, setMeditations] = useState<SavedMeditation[]>([])
  const [activeFolderId, setActiveFolderId] = useState<string>(ALL_NOTES)
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [mobilePane, setMobilePane] = useState<"list" | "note">("list")
  const [isBusy, setIsBusy] = useState(false)
  const [showMeditationPicker, setShowMeditationPicker] = useState(false)
  const [showQuotePicker, setShowQuotePicker] = useState(false)
  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [folderName, setFolderName] = useState("")
  const [notePendingDelete, setNotePendingDelete] = useState<JournalNote | null>(null)
  const [showNoteMenu, setShowNoteMenu] = useState(false)

  const editorHandle = useRef<NoteEditorHandle | null>(null)
  const [editorInstanceKey, setEditorInstanceKey] = useState(0)
  const recorder = useVoiceRecorder()

  useEffect(() => {
    let mounted = true
    MeditationLibrary.getAllMeditations()
      .then((all) => mounted && setMeditations(all))
      .catch((error) => console.error("Unable to load meditations", error))
    return () => {
      mounted = false
    }
  }, [isAuthenticated])

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

  // Keep a note selected on desktop so the document pane is never empty for no reason.
  useEffect(() => {
    if (activeNoteId && notes.some((note) => note.id === activeNoteId)) return
    setActiveNoteId(visibleNotes[0]?.id ?? null)
  }, [visibleNotes, activeNoteId, notes])

  const handleSave = useCallback(
    async (markdown: string) => {
      if (!activeNoteId) return false
      return updateNote(activeNoteId, { contentMd: markdown })
    },
    [activeNoteId, updateNote],
  )

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
      console.error("[journal] Image attach failed:", error)
      toast({ title: "Couldn't add the image", description: "Please try again.", variant: "destructive" })
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
        console.error("[journal] Voice note failed:", error)
        toast({ title: "Couldn't save the voice note", description: "Please try again.", variant: "destructive" })
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
        "flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors",
        activeFolderId === id ? "bg-white shadow-sm" : "hover:bg-white/60",
      )}
    >
      <span className="truncate font-serif text-sm font-black text-gray-700">{name}</span>
      <span className="flex-shrink-0 text-[11px] font-black text-gray-400">{count}</span>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 pt-20 md:p-8 md:pt-24">
      <Navigation showProfileButton />
      <main className="px-0">
        <div className="w-full space-y-0 md:mx-auto md:max-w-6xl">
          {!isAuthenticated && (
            <div className="z-10 flex justify-center pb-7 pt-0">
              <AuthButtons onLogin={login} />
            </div>
          )}

          <div className="relative w-full overflow-hidden rounded-3xl bg-white/80 shadow-none backdrop-blur-lg md:shadow-xl">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center space-y-3 bg-white/80 p-6 text-center backdrop-blur-sm">
                <p className="font-serif text-lg font-black text-gray-800">Create account to save</p>
              </div>
            )}

            <div className="grid min-h-[70vh] md:grid-cols-[200px_minmax(0,280px)_minmax(0,1fr)]">
              {/* Folders */}
              <aside
                className={cn(
                  "border-muted bg-muted/30 p-3 md:block md:border-r",
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
                  className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-black text-gray-500 transition-colors hover:bg-white/60 hover:text-gray-700"
                >
                  <FolderPlus className="h-4 w-4" />
                  New folder
                </button>
              </aside>

              {/* Note list */}
              <section
                className={cn(
                  "border-muted p-3 md:block md:border-r md:pt-6",
                  mobilePane === "list" ? "block" : "hidden",
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-2 px-1">
                  <div className="min-w-0 truncate font-serif text-sm font-black text-gray-700">
                    {activeFolderName}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleNewNote}
                    className="flex-shrink-0 bg-gradient-to-r from-logo-rose-300 to-logo-emerald-400 font-black text-white shadow-md hover:shadow-none"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    New
                  </Button>
                </div>

                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search notes"
                    className="w-full rounded-lg border border-input bg-white/70 py-1.5 pl-8 pr-2 text-xs text-gray-600 outline-none placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-1.5 md:max-h-[62vh] md:overflow-y-auto md:pr-1">
                  {isLoading ? (
                    [0, 1, 2].map((index) => (
                      <div key={index} className="animate-pulse rounded-lg p-3">
                        <div className="mb-2 h-3 w-32 rounded bg-muted" />
                        <div className="h-3 w-20 rounded bg-muted/70" />
                      </div>
                    ))
                  ) : visibleNotes.length === 0 ? (
                    <div className="px-2 py-10 text-center">
                      <NotebookPen className="mx-auto mb-3 h-8 w-8 text-logo-rose-300" />
                      <p className="font-serif text-sm font-black text-gray-500">
                        {search ? "No matching notes" : "No notes yet"}
                      </p>
                    </div>
                  ) : (
                    visibleNotes.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => {
                          setActiveNoteId(note.id)
                          setMobilePane("note")
                          setEditorInstanceKey((key) => key + 1)
                        }}
                        className={cn(
                          "w-full min-w-0 rounded-lg px-3 py-2.5 text-left transition-colors",
                          note.id === activeNoteId ? "bg-white shadow-sm" : "hover:bg-white/60",
                        )}
                      >
                        <div className="truncate font-serif text-sm font-black text-gray-700">{note.title}</div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="flex-shrink-0 text-[11px] font-black text-gray-400">
                            {formatListDate(note.updatedAt)}
                          </span>
                          <span className="truncate font-serif text-xs text-gray-500">
                            {note.preview || "No additional text"}
                          </span>
                        </div>
                        {note.meditationTitle && (
                          <div className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.12em] text-logo-emerald-400">
                            {note.meditationTitle}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </section>

              {/* Document */}
              <section className={cn("min-w-0 p-4 md:block md:p-8", mobilePane === "note" ? "block" : "hidden")}>
                {activeNote ? (
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
                          className="rounded-md p-2 text-gray-500 transition-colors hover:bg-muted hover:text-gray-700"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {showNoteMenu && (
                          <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-lg border-[3px] border-muted bg-white p-1 shadow-lg">
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
                    <NotebookPen className="mb-3 h-10 w-10 text-logo-rose-300" />
                    <p className="font-serif text-sm font-black text-gray-500">
                      Select a note, or start a new one.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>

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
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-600"
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
              className="bg-gradient-to-r from-logo-rose-300 to-logo-emerald-400 font-black text-white shadow-md hover:shadow-none disabled:opacity-40"
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
    </div>
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

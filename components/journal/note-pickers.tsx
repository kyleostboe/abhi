"use client"

/** Pickers for the two "reference something" blocks: a meditation, or a passage from a note. */

import { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { SavedMeditation } from "@/lib/meditation-library"
import type { JournalNote } from "@/hooks/use-journal-notes"
import { slugify } from "@/lib/journal-markdown"
import { cn } from "@/lib/utils"

export function MeditationPicker({
  open,
  onOpenChange,
  meditations,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  meditations: SavedMeditation[]
  onPick: (params: { slug: string; title: string; meditationId: string }) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reference a meditation</DialogTitle>
          <DialogDescription>Link a meditation from your library into this note.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {meditations.length === 0 ? (
            <p className="py-6 text-center font-serif text-sm font-black text-gray-500">
              No meditations in your library yet.
            </p>
          ) : (
            meditations.map((meditation) => (
              <button
                key={meditation.id}
                type="button"
                onClick={() => {
                  onPick({
                    slug: slugify(meditation.title, meditation.id.replace(/-/g, "")),
                    title: meditation.title,
                    meditationId: meditation.id,
                  })
                  onOpenChange(false)
                }}
                className="w-full min-w-0 rounded-xl border-[3px] border-gray-300/60 bg-muted/60 px-4 py-3 text-left font-serif transition-colors hover:bg-white"
              >
                <div className="truncate text-sm font-black text-gray-700">{meditation.title}</div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function QuotePicker({
  open,
  onOpenChange,
  notes,
  currentNoteId,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  notes: JournalNote[]
  currentNoteId: string | null
  onPick: (params: { text: string; noteSlug: string; noteTitle: string }) => void
}) {
  const [selected, setSelected] = useState<JournalNote | null>(null)
  const [text, setText] = useState("")

  const candidates = notes.filter((note) => note.id !== currentNoteId)

  const reset = () => {
    setSelected(null)
    setText("")
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quote another note</DialogTitle>
          <DialogDescription>
            {selected ? "Edit the passage to quote." : "Pick the note you want to quote from."}
          </DialogDescription>
        </DialogHeader>

        {!selected ? (
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {candidates.length === 0 ? (
              <p className="py-6 text-center font-serif text-sm font-black text-gray-500">
                No other notes to quote yet.
              </p>
            ) : (
              candidates.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => {
                    setSelected(note)
                    setText(note.preview || note.title)
                  }}
                  className="w-full min-w-0 rounded-xl border-[3px] border-gray-300/60 bg-muted/60 px-4 py-3 text-left transition-colors hover:bg-white"
                >
                  <div className="truncate text-sm font-black text-gray-700">{note.title}</div>
                  <div className="truncate font-serif text-xs text-gray-500">{note.preview}</div>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="truncate text-xs font-black uppercase tracking-[0.15em] text-gray-400">
              {selected.title}
            </div>
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={5}
              className="font-serif text-sm text-gray-600"
            />
          </div>
        )}

        <DialogFooter className="sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              if (selected) reset()
              else onOpenChange(false)
            }}
          >
            {selected ? "Back" : "Cancel"}
          </Button>
          <Button
            disabled={!selected || !text.trim()}
            onClick={() => {
              if (!selected) return
              onPick({ text: text.trim(), noteSlug: selected.slug, noteTitle: selected.title })
              reset()
              onOpenChange(false)
            }}
            className={cn(
              "bg-gradient-to-r from-logo-rose-300 to-logo-emerald-400 font-black text-white shadow-md hover:shadow-none",
              "disabled:opacity-40 disabled:shadow-none",
            )}
          >
            Insert quote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

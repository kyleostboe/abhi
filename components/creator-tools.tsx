"use client"

/**
 * Two Creator surfaces that are self-contained enough to keep out of app/page.tsx.
 *
 * RecordingPicker lists reusable voice clips from the library. TimelineShape holds the two
 * structural edits — repeat a stretch, stretch the whole thing — which together let a meditation
 * be written as a shape rather than as a fixed sequence at a fixed length.
 */

import { useEffect, useState } from "react"
import { Repeat, Scaling } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MeditationLibrary, type SavedMeditation } from "@/lib/meditation-library"
import { minimumTimelineDuration } from "@/lib/timeline-ops"
import type { TimelineEvent } from "@/lib/types"
import { cn, formatTime } from "@/lib/utils"
import { log } from "@/lib/log"

export function RecordingPicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (recording: SavedMeditation) => void
}) {
  const [recordings, setRecordings] = useState<SavedMeditation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    let active = true
    setIsLoading(true)

    MeditationLibrary.getRecordings()
      .then((all) => {
        if (active) setRecordings(all)
      })
      .catch((error) => log.error("[creator] Unable to load recordings:", error))
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Saved recordings</DialogTitle>
          <DialogDescription>Your own voice, reusable across meditations.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-6 text-center font-serif text-xs tracking-tight text-gray-400">Loading...</p>
        ) : recordings.length === 0 ? (
          <p className="py-6 text-center font-serif text-xs tracking-tight text-gray-400">
            No saved recordings yet. Record something and choose &ldquo;Keep in library&rdquo;.
          </p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {recordings.map((recording) => (
              <button
                key={recording.id}
                type="button"
                onClick={() => {
                  onSelect(recording)
                  onOpenChange(false)
                }}
                className="flex w-full items-center justify-between gap-3 rounded-[10px] border-[3px] border-muted bg-white p-3 text-left transition-colors hover:border-stone-300"
              >
                <span className="min-w-0 flex-1 truncate font-serif text-xs font-black tracking-tight text-gray-700">
                  {recording.title}
                </span>
                <span className="flex-shrink-0 font-serif text-[11px] tracking-tight text-gray-400">
                  {formatTime(recording.duration)}
                </span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function TimelineShape({
  events,
  totalDuration,
  onRepeat,
  onScale,
}: {
  events: TimelineEvent[]
  totalDuration: number
  onRepeat: (range: { from: number; to: number; times: number }) => void
  onScale: (targetSeconds: number) => void
}) {
  const [from, setFrom] = useState(0)
  const [to, setTo] = useState(0)
  const [times, setTimes] = useState(1)
  const [targetMinutes, setTargetMinutes] = useState(() => Math.max(1, Math.round(totalDuration / 60)))

  useEffect(() => {
    setTargetMinutes(Math.max(1, Math.round(totalDuration / 60)))
    setTo((current) => (current > 0 ? current : totalDuration))
  }, [totalDuration])

  // Durations do not scale — only the space between events — so there is a length below which
  // events would start colliding. Computed the same way the Adjuster checks feasibility before
  // doing any work.
  const floorSeconds = minimumTimelineDuration(events, totalDuration)
  const floorMinutes = Math.ceil(floorSeconds / 60)
  const target = targetMinutes * 60
  const tooShort = floorSeconds > 0 && target < floorSeconds

  const rangeIsValid = to > from
  const eventsInRange = events.filter((event) => event.startTime >= from && event.startTime < to).length

  if (events.length === 0) return null

  return (
    // These are sections of the Timeline Editor, not tools of their own, so they take the
    // Creator's in-card rhythm: a plain heading the size of "Timeline Events", its controls
    // under it, and one full-width button the shape of "Add to Timeline". Boxing them made
    // them read as foreign, and a small dark button beside small fields read as a chip.
    <div className="space-y-8 text-left">
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-base font-black text-gray-600">
          <Repeat className="h-4 w-4" />
          Repeat a stretch
        </h4>
        <div className="flex flex-wrap items-end gap-3">
          <NumberField label="From" value={from} onChange={setFrom} suffix="s" />
          <NumberField label="To" value={to} onChange={setTo} suffix="s" />
          <NumberField label="Times" value={times} onChange={setTimes} min={1} />
        </div>
        <p className="font-serif text-xs tracking-tight text-gray-400">
          {!rangeIsValid
            ? "Set an end later than the start."
            : eventsInRange === 0
              ? "Nothing starts in that stretch."
              : `${eventsInRange} ${eventsInRange === 1 ? "event" : "events"}, repeated ${times}× — adds ${formatTime((to - from) * times)}.`}
        </p>
        <div className="flex justify-center pt-1">
          <Button
            className="w-full max-w-[352px]"
            disabled={!rangeIsValid || eventsInRange === 0}
            onClick={() => onRepeat({ from, to, times })}
          >
            <Repeat className="mr-2 h-4 w-4" />
            Repeat
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-base font-black text-gray-600">
          <Scaling className="h-4 w-4" />
          Stretch the whole thing
        </h4>
        <div className="flex flex-wrap items-end gap-3">
          <NumberField label="Length" value={targetMinutes} onChange={setTargetMinutes} min={1} suffix="min" />
        </div>
        <p className={cn("font-serif text-xs tracking-tight", tooShort ? "text-destructive" : "text-gray-400")}>
          {tooShort
            ? `Too short — events would overlap below about ${floorMinutes} min.`
            : "Spacing scales; the recordings and bells keep their own length."}
        </p>
        <div className="flex justify-center pt-1">
          <Button className="w-full max-w-[352px]" disabled={tooShort} onClick={() => onScale(target)}>
            <Scaling className="mr-2 h-4 w-4" />
            Scale
          </Button>
        </div>
      </div>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  suffix,
}: {
  label: string
  value: number
  onChange: (next: number) => void
  min?: number
  suffix?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-black tracking-tight text-gray-500">{label}</span>
      <span className="flex items-center gap-1.5">
        <input
          type="number"
          min={min}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value)
            onChange(Number.isFinite(next) ? Math.max(min, next) : min)
          }}
          className="h-10 w-[76px] rounded-[10px] border-0 bg-muted/50 px-3 font-serif text-sm font-black text-gray-600 shadow-inner focus-visible:outline-none"
        />
        {suffix ? <span className="font-serif text-xs text-gray-400">{suffix}</span> : null}
      </span>
    </label>
  )
}

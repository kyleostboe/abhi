"use client"

/**
 * The silent timer: a sit with no recording behind it.
 *
 * A tool, so it lives in the home page's mode switch alongside the Adjuster and the Creator
 * rather than in the top navigation, and it works without an account for the same reason they do
 * — what an account buys is somewhere for the result to persist, and a sit that is not recorded
 * is still a sit. When signed in, the sit is logged to the practice log; when not, it simply runs.
 *
 * Deliberately not built on the Creator. A timer produces no audio file, has nothing to export
 * and nothing to store but the practice record — routing it through a timeline that renders and
 * encodes would make the simplest thing in the app the most expensive. The whole surface is a
 * schedule of bells (lib/timer-schedule.ts) handed to the audio clock (lib/timer-audio.ts).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { TimerWheel } from "@/components/timer-wheel"
import { useAuth } from "@/hooks/use-auth"
import { useSessions } from "@/hooks/use-sessions"
import { useToast } from "@/hooks/use-toast"
import { BELL_VOICES, DEFAULT_BELL_ID, TimerAudio, bellVoiceById } from "@/lib/timer-audio"
import { type TimerBell, buildTimerSchedule, formatTimerClock, remainingSeconds } from "@/lib/timer-schedule"
import { cn } from "@/lib/utils"

const INTERVAL_OPTIONS = [
  { label: "None", seconds: 0 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "15 min", seconds: 900 },
  { label: "20 min", seconds: 1200 },
  { label: "30 min", seconds: 1800 },
]

const WARMUP_OPTIONS = [
  { label: "None", seconds: 0 },
  { label: "10 s", seconds: 10 },
  { label: "30 s", seconds: 30 },
  { label: "1 min", seconds: 60 },
]

const DEFAULT_DURATION_SECONDS = 20 * 60

type TimerState = "idle" | "running" | "finished"

export function TimerTool() {
  const { isAuthenticated } = useAuth()
  const { startSession, reportProgress, endSession } = useSessions()
  const { toast } = useToast()

  const [durationSeconds, setDurationSeconds] = useState(DEFAULT_DURATION_SECONDS)
  const [openEnded, setOpenEnded] = useState(false)
  const [warmupSeconds, setWarmupSeconds] = useState(30)
  const [intervalSeconds, setIntervalSeconds] = useState(0)
  const [openingBell, setOpeningBell] = useState(true)
  const [closingBell, setClosingBell] = useState(true)
  const [bellId, setBellId] = useState(DEFAULT_BELL_ID)

  const [state, setState] = useState<TimerState>("idle")
  const [elapsed, setElapsed] = useState(0)

  const audioRef = useRef<TimerAudio | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const lastReportRef = useRef(0)

  const schedule = useMemo(
    () =>
      buildTimerSchedule({
        durationSeconds: openEnded ? null : durationSeconds,
        warmupSeconds,
        intervalSeconds,
        openingBell,
        closingBell,
      }),
    [openEnded, durationSeconds, warmupSeconds, intervalSeconds, openingBell, closingBell],
  )

  const getAudio = useCallback(() => {
    if (!audioRef.current) audioRef.current = new TimerAudio()
    return audioRef.current
  }, [])

  useEffect(() => {
    return () => {
      void audioRef.current?.dispose()
      audioRef.current = null
    }
  }, [])

  const finishSit = useCallback(
    async (reason: "completed" | "ended") => {
      const startedAt = startedAtRef.current
      startedAtRef.current = null

      const audio = audioRef.current
      audio?.cancelAll()
      audio?.stopKeepAlive()

      const satSeconds = startedAt === null ? 0 : Math.max(0, (Date.now() - startedAt) / 1000 - warmupSeconds)

      // No session when signed out — the sit still ran, there is just nowhere to record it.
      const sessionId = sessionIdRef.current
      sessionIdRef.current = null
      if (sessionId) {
        await endSession(sessionId, { durationActual: satSeconds, lastPosition: satSeconds })
      }

      setState(reason === "completed" ? "finished" : "idle")
      if (reason === "ended") setElapsed(0)
    },
    [endSession, warmupSeconds],
  )

  const startSit = useCallback(async () => {
    const audio = getAudio()
    const ready = await audio.prepare()
    if (!ready) {
      toast({
        title: "Audio unavailable",
        description: "This browser would not start audio playback, so the bells cannot ring.",
        variant: "destructive",
      })
      return
    }

    audio.startKeepAlive()

    // Every bell for the whole sit goes onto the audio clock now, while the page is definitely
    // awake. Nothing later depends on a timer firing on schedule.
    const base = audio.now() + 0.15
    const voice = bellVoiceById(bellId)
    for (const bell of schedule.bells as TimerBell[]) {
      audio.scheduleBell(base + bell.at, voice, bell.kind === "interval" ? 0.7 : 1)
    }

    startedAtRef.current = Date.now()
    lastReportRef.current = 0
    setElapsed(0)
    setState("running")

    const session = await startSession({
      source: "timer",
      meditationId: null,
      meditationTitle: null,
      durationPlanned: openEnded ? null : durationSeconds,
    })
    sessionIdRef.current = session?.id ?? null
  }, [getAudio, toast, bellId, schedule, startSession, openEnded, durationSeconds])

  // Drives the display only. The bells do not depend on this interval running on time — which is
  // the point, since it will not while the screen is off.
  useEffect(() => {
    if (state !== "running") return

    const tick = () => {
      const startedAt = startedAtRef.current
      if (startedAt === null) return

      const seconds = (Date.now() - startedAt) / 1000
      setElapsed(seconds)

      const sessionId = sessionIdRef.current
      const sat = Math.max(0, seconds - warmupSeconds)
      if (sessionId && sat - lastReportRef.current >= 15) {
        lastReportRef.current = sat
        void reportProgress(sessionId, { durationActual: sat, lastPosition: sat })
      }

      if (schedule.totalSeconds !== null && seconds >= schedule.totalSeconds) {
        void finishSit("completed")
      }
    }

    const interval = window.setInterval(tick, 250)
    tick()
    return () => window.clearInterval(interval)
  }, [state, schedule.totalSeconds, warmupSeconds, reportProgress, finishSit])

  const previewBell = useCallback(
    async (id: string) => {
      setBellId(id)
      await getAudio().preview(bellVoiceById(id))
    },
    [getAudio],
  )

  const remaining = remainingSeconds(schedule, elapsed)
  const inWarmup = elapsed < schedule.sitStartsAt
  const satSeconds = Math.max(0, elapsed - schedule.sitStartsAt)

  if (state === "running") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-stone-900 to-gray-900 p-8">
        <p className="mb-4 font-serif text-[11px] font-black uppercase tracking-[0.3em] text-stone-500">
          {inWarmup ? "Settling" : "Sitting"}
        </p>
        <p className="font-serif text-6xl font-black tabular-nums tracking-tight text-stone-100 md:text-7xl">
          {formatTimerClock(inWarmup ? schedule.sitStartsAt - elapsed : (remaining ?? satSeconds))}
        </p>
        <p className="mt-3 font-serif text-xs tracking-tight text-stone-500">
          {remaining === null ? "Open-ended" : `of ${formatTimerClock(durationSeconds)}`}
        </p>

        <Button
          variant="ghost"
          onClick={() => void finishSit("ended")}
          className="mt-12 font-serif text-xs font-black tracking-tight text-stone-400 hover:text-stone-200"
        >
          End sit
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      {state === "finished" ? (
        <p className="mb-5 text-center font-serif text-xs tracking-tight text-logo-teal-600">
          {isAuthenticated ? "Sit recorded. It is in your practice log." : "Sit complete."}
        </p>
      ) : null}

      <div className={cn("mb-6", openEnded && "pointer-events-none opacity-40")}>
        <TimerWheel value={durationSeconds} onChange={setDurationSeconds} maxHours={3} />
      </div>

      <div className="space-y-5">
        <ToggleRow
          label="Open-ended"
          description="No fixed length. Ends when you end it."
          checked={openEnded}
          onChange={setOpenEnded}
        />
        <ToggleRow label="Opening bell" checked={openingBell} onChange={setOpeningBell} />
        <ToggleRow
          label="Closing bell"
          checked={closingBell}
          onChange={setClosingBell}
          disabled={openEnded}
          description={openEnded ? "An open-ended sit has no end to ring." : undefined}
        />

        <OptionRow label="Settling time" options={WARMUP_OPTIONS} value={warmupSeconds} onChange={setWarmupSeconds} />
        <OptionRow
          label="Interval bells"
          options={INTERVAL_OPTIONS}
          value={intervalSeconds}
          onChange={setIntervalSeconds}
        />

        <div>
          <Label className="mb-2 block text-[11px] font-black uppercase tracking-[0.15em] text-gray-500">Bell</Label>
          <div className="flex flex-wrap gap-2">
            {BELL_VOICES.map((voice) => (
              <button
                key={voice.id}
                type="button"
                onClick={() => void previewBell(voice.id)}
                className={cn(
                  "rounded-[10px] px-3 py-2 font-serif text-xs font-black tracking-tight transition-colors",
                  voice.id === bellId
                    ? "bg-gradient-to-r from-gray-600 to-gray-500 text-white shadow-md"
                    : "bg-muted/60 text-gray-600 hover:bg-muted",
                )}
              >
                {voice.name}
              </button>
            ))}
          </div>
          <p className="mt-2 font-serif text-[11px] tracking-tight text-gray-400">Tap to hear it.</p>
        </div>
      </div>

      <div className="mt-7">
        <Button onClick={() => void startSit()} variant="accent" className="w-full">
          Begin
        </Button>
        <p className="mt-3 text-center font-serif text-[11px] tracking-tight text-gray-400">
          {schedule.bells.length === 0
            ? "No bells — a silent sit."
            : `${schedule.bells.length} ${schedule.bells.length === 1 ? "bell" : "bells"}${
                schedule.totalSeconds !== null ? ` over ${formatTimerClock(schedule.totalSeconds)}` : ""
              }`}
        </p>
        {!isAuthenticated ? (
          <p className="mt-2 text-center font-serif text-[11px] tracking-tight text-gray-400">
            Sign in to keep a record of your sits.
          </p>
        ) : null}
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4", disabled && "opacity-40")}>
      <div className="min-w-0">
        <p className="font-serif text-xs font-black tracking-tight text-gray-600">{label}</p>
        {description ? (
          <p className="mt-0.5 font-serif text-[11px] tracking-tight text-gray-400">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-10 flex-shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-gray-500" : "bg-gray-200",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  )
}

function OptionRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { label: string; seconds: number }[]
  value: number
  onChange: (next: number) => void
}) {
  return (
    <div>
      <Label className="mb-2 block text-[11px] font-black uppercase tracking-[0.15em] text-gray-500">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.seconds}
            type="button"
            onClick={() => onChange(option.seconds)}
            className={cn(
              "rounded-[10px] px-3 py-2 font-serif text-xs font-black tracking-tight transition-colors",
              option.seconds === value
                ? "bg-gradient-to-r from-gray-600 to-gray-500 text-white shadow-md"
                : "bg-muted/60 text-gray-600 hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

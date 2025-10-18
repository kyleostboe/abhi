"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EncoderDurationTimerProps {
  totalSeconds: number
  onDurationChange: (seconds: number) => void
  isTimerMode: boolean
  onTimerModeChange: (active: boolean) => void
  onTimerFinalize?: (durationSeconds: number) => void
}

const MAX_HOURS = 12
const ITEM_HEIGHT = 40

const HOURS_VALUES = Array.from({ length: MAX_HOURS + 1 }, (_, index) => index)
const MINUTE_SECOND_VALUES = Array.from({ length: 60 }, (_, index) => index)

type TimePart = "hours" | "minutes" | "seconds"

type WheelPickerProps = {
  label: string
  values: number[]
  selected: number
  onSelect: (value: number) => void
  disabled?: boolean
}

const formatTimeParts = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60
  return { hours, minutes, seconds }
}

const formatTimerDisplay = (seconds: number) => {
  const clamped = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(clamped / 3600)
  const minutes = Math.floor((clamped % 3600) / 60)
  const secs = clamped % 60
  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

function WheelPicker({ label, values, selected, onSelect, disabled }: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<number | null>(null)
  const [isUserScrolling, setIsUserScrolling] = useState(false)

  const clampToIndex = useCallback(
    (value: number) => {
      const idx = values.indexOf(value)
      return idx >= 0 ? idx : 0
    },
    [values],
  )

  const scrollToValue = useCallback(
    (value: number, behavior: ScrollBehavior = "smooth") => {
      const container = containerRef.current
      if (!container) return
      const index = clampToIndex(value)
      const targetTop = index * ITEM_HEIGHT
      if (Math.abs(container.scrollTop - targetTop) > 1) {
        container.scrollTo({ top: targetTop, behavior })
      }
    },
    [clampToIndex],
  )

  useEffect(() => {
    if (isUserScrolling) {
      return
    }
    scrollToValue(selected, "auto")
  }, [selected, isUserScrolling, scrollToValue])

  useEffect(() => () => {
    if (scrollTimeoutRef.current !== null) {
      window.clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  const handleScroll = () => {
    if (disabled) return
    if (scrollTimeoutRef.current !== null) {
      window.clearTimeout(scrollTimeoutRef.current)
    }
    setIsUserScrolling(true)
    scrollTimeoutRef.current = window.setTimeout(() => {
      const container = containerRef.current
      if (!container) return
      const index = Math.round(container.scrollTop / ITEM_HEIGHT)
      const clampedIndex = Math.max(0, Math.min(values.length - 1, index))
      const value = values[clampedIndex]
      setIsUserScrolling(false)
      if (value !== selected) {
        onSelect(value)
      }
    }, 100)
  }

  const handleItemClick = (value: number) => {
    if (disabled) return
    onSelect(value)
    scrollToValue(value)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault()
      const currentIndex = clampToIndex(selected)
      const delta = event.key === "ArrowUp" ? -1 : 1
      const nextIndex = Math.max(0, Math.min(values.length - 1, currentIndex + delta))
      const nextValue = values[nextIndex]
      if (nextValue !== selected) {
        onSelect(nextValue)
        scrollToValue(nextValue)
      }
    }
  }

  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-black mb-2">{label}</span>
      <div className="relative h-36 w-20 overflow-hidden rounded-xl bg-white shadow-inner">
        <div className="pointer-events-none absolute inset-x-3 top-1/2 h-10 -translate-y-1/2 rounded-md border border-gray-300 bg-white/70 shadow-sm" />
        <div
          ref={containerRef}
          className={cn(
            "h-36 overflow-y-auto scroll-smooth snap-y snap-mandatory focus-visible:outline-none",
            disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing",
            "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent",
          )}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          tabIndex={disabled ? -1 : 0}
          role="listbox"
          aria-label={label}
        >
          <div style={{ height: ITEM_HEIGHT }} aria-hidden="true" />
          {values.map((value) => (
            <button
              key={value}
              type="button"
              role="option"
              aria-selected={selected === value}
              onClick={() => handleItemClick(value)}
              className={cn(
                "flex h-10 w-full snap-center items-center justify-center text-sm font-black transition-colors",
                selected === value ? "text-gray-800" : "text-gray-400 hover:text-gray-500",
              )}
              disabled={disabled}
            >
              {value.toString().padStart(2, "0")}
            </button>
          ))}
          <div style={{ height: ITEM_HEIGHT }} aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

export function EncoderDurationTimer({
  totalSeconds,
  onDurationChange,
  isTimerMode,
  onTimerModeChange,
  onTimerFinalize,
}: EncoderDurationTimerProps) {
  const { hours, minutes, seconds } = useMemo(() => formatTimeParts(totalSeconds), [totalSeconds])
  const [timerRemaining, setTimerRemaining] = useState(() => Math.max(1, Math.floor(totalSeconds)))
  const [timerStatus, setTimerStatus] = useState<"idle" | "running" | "paused" | "finished">("idle")
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (timerStatus === "running") {
      return
    }
    setTimerRemaining(Math.max(1, Math.floor(totalSeconds)))
  }, [totalSeconds, timerStatus])

  useEffect(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (!isTimerMode || timerStatus !== "running") {
      return
    }
    intervalRef.current = window.setInterval(() => {
      setTimerRemaining((previous) => {
        if (previous <= 1) {
          if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          setTimerStatus("finished")
          return 0
        }
        return previous - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isTimerMode, timerStatus])

  useEffect(() => {
    if (!isTimerMode) {
      setTimerStatus("idle")
      setTimerRemaining(Math.max(1, Math.floor(totalSeconds)))
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isTimerMode, totalSeconds])

  const updateDurationPart = useCallback(
    (part: TimePart, value: number) => {
      const { hours: currentHours, minutes: currentMinutes, seconds: currentSeconds } = formatTimeParts(totalSeconds)
      const sanitized = Math.max(0, Math.floor(value))
      const nextHours = part === "hours" ? Math.min(MAX_HOURS, sanitized) : currentHours
      const nextMinutes = part === "minutes" ? Math.min(59, sanitized) : currentMinutes
      const nextSeconds = part === "seconds" ? Math.min(59, sanitized) : currentSeconds
      const nextTotal = nextHours * 3600 + nextMinutes * 60 + nextSeconds
      onDurationChange(Math.max(1, nextTotal))
    },
    [onDurationChange, totalSeconds],
  )

  const handleToggleTimerMode = () => {
    if (isTimerMode) {
      const elapsed = Math.max(0, Math.floor(totalSeconds - timerRemaining))
      const nextDuration = elapsed > 0 ? elapsed : Math.max(1, Math.floor(totalSeconds))
      onTimerFinalize?.(Math.max(1, nextDuration))
      setTimerStatus("idle")
      setTimerRemaining(Math.max(1, nextDuration))
      onTimerModeChange(false)
    } else {
      setTimerStatus("idle")
      setTimerRemaining(Math.max(1, Math.floor(totalSeconds)))
      onTimerModeChange(true)
    }
  }

  const handleStart = () => {
    if (timerRemaining <= 0) {
      setTimerRemaining(Math.max(1, Math.floor(totalSeconds)))
    }
    setTimerStatus("running")
  }

  const handleStop = () => {
    setTimerStatus("paused")
  }

  const handleReset = () => {
    setTimerStatus("idle")
    setTimerRemaining(Math.max(1, Math.floor(totalSeconds)))
  }

  const disableAdjustments = isTimerMode && timerStatus === "running"
  const timerDisplay = formatTimerDisplay(timerRemaining)
  const timerMessage = timerStatus === "finished" ? "Time's up" : timerStatus === "paused" ? "Paused" : undefined

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-end justify-center gap-3">
        <WheelPicker label="Hours" values={HOURS_VALUES} selected={hours} onSelect={(value) => updateDurationPart("hours", value)} disabled={disableAdjustments} />
        <WheelPicker
          label="Minutes"
          values={MINUTE_SECOND_VALUES}
          selected={minutes}
          onSelect={(value) => updateDurationPart("minutes", value)}
          disabled={disableAdjustments}
        />
        <WheelPicker
          label="Seconds"
          values={MINUTE_SECOND_VALUES}
          selected={seconds}
          onSelect={(value) => updateDurationPart("seconds", value)}
          disabled={disableAdjustments}
        />
      </div>

      <div className="flex flex-col items-center gap-2">
        {isTimerMode && (
          <div className="text-center">
            <div className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-lg font-black text-gray-600 shadow-sm">
              {timerDisplay}
            </div>
            {timerMessage && <div className="mt-1 text-xs font-serif font-black text-gray-500">{timerMessage}</div>}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {isTimerMode && (
            <>
              <Button size="sm" onClick={handleStart} disabled={timerStatus === "running" || timerRemaining <= 0}>
                {timerStatus === "paused" || timerStatus === "finished" ? "Resume" : "Start"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleStop} disabled={timerStatus !== "running"}>
                Stop
              </Button>
              <Button size="sm" variant="secondary" onClick={handleReset}>
                Reset
              </Button>
            </>
          )}
          <Button size="sm" variant={isTimerMode ? "secondary" : "outline"} onClick={handleToggleTimerMode}>
            {isTimerMode ? "Return to encoder" : "Use as timer"}
          </Button>
        </div>
      </div>
    </div>
  )
}

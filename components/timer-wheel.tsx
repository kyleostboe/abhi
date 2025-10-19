"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"

import { cn } from "@/lib/utils"

const ITEM_HEIGHT = 44
const PADDING_ITEMS = 2

interface TimerWheelColumnProps {
  label: string
  value: number
  options: number[]
  onSelect: (value: number) => void
}

const padNumber = (value: number) => value.toString().padStart(2, "0")

const TimerWheelColumn: React.FC<TimerWheelColumnProps> = ({ label, value, options, onSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasMountedRef = useRef(false)

  const clampToOption = useCallback(
    (index: number) => {
      if (options.length === 0) {
        return options[0] ?? 0
      }
      if (index <= 0) {
        return options[0]
      }
      if (index >= options.length - 1) {
        return options[options.length - 1]
      }
      return options[index]
    },
    [options],
  )

  const alignToValue = useCallback(
    (nextValue: number, behavior: ScrollBehavior = "smooth") => {
      if (!containerRef.current) {
        return
      }
      const nextIndex = options.indexOf(nextValue)
      const targetIndex = nextIndex >= 0 ? nextIndex : 0
      const scrollTop = targetIndex * ITEM_HEIGHT
      containerRef.current.scrollTo({ top: scrollTop, behavior })
    },
    [options],
  )

  useEffect(() => {
    const behavior = hasMountedRef.current ? "smooth" : "auto"
    alignToValue(value, behavior)
    hasMountedRef.current = true
  }, [alignToValue, value])

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = null
      }
    }
  }, [])

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      const target = event.currentTarget
      scrollTimeoutRef.current = setTimeout(() => {
        const rawIndex = Math.round(target.scrollTop / ITEM_HEIGHT)
        const option = clampToOption(rawIndex)
        if (option !== value) {
          onSelect(option)
        } else {
          alignToValue(option)
        }
      }, 80)
    },
    [alignToValue, clampToOption, onSelect, value],
  )

  const handleOptionClick = useCallback(
    (option: number) => {
      if (option !== value) {
        onSelect(option)
      } else {
        alignToValue(option)
      }
    },
    [alignToValue, onSelect, value],
  )

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <div className="relative w-20">
        <div className="pointer-events-none absolute inset-x-2 top-1/2 h-10 -translate-y-1/2 rounded-lg bg-emerald-100/60" />
        <div
          ref={containerRef}
          onScroll={handleScroll}
          role="listbox"
          aria-label={label}
          className="h-48 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-inner"
          style={{
            scrollSnapType: "y mandatory",
            scrollPaddingTop: ITEM_HEIGHT * PADDING_ITEMS,
            scrollPaddingBottom: ITEM_HEIGHT * PADDING_ITEMS,
            paddingTop: ITEM_HEIGHT * PADDING_ITEMS,
            paddingBottom: ITEM_HEIGHT * PADDING_ITEMS,
          }}
        >
          {options.map((option) => {
            const isActive = option === value
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isActive}
                className={cn(
                  "flex w-full items-center justify-center rounded-lg px-3 text-lg font-semibold transition-colors duration-150",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
                  isActive
                    ? "text-emerald-600"
                    : "text-gray-500 hover:bg-emerald-50 hover:text-emerald-600",
                )}
                style={{ height: ITEM_HEIGHT, scrollSnapAlign: "center" }}
                onClick={() => handleOptionClick(option)}
              >
                {padNumber(option)}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const convertSecondsToParts = (totalSeconds: number) => {
  const safeTotal = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0))
  const hours = Math.floor(safeTotal / 3600)
  const minutes = Math.floor((safeTotal % 3600) / 60)
  const seconds = safeTotal % 60
  return { hours, minutes, seconds }
}

export interface TimerWheelProps {
  value: number
  onChange: (totalSeconds: number) => void
  className?: string
  maxHours?: number
}

export const TimerWheel: React.FC<TimerWheelProps> = ({ value, onChange, className, maxHours = 23 }) => {
  const parts = useMemo(() => convertSecondsToParts(value), [value])
  const hoursLimit = useMemo(() => Math.max(maxHours, parts.hours + 1), [maxHours, parts.hours])
  const hourOptions = useMemo(() => Array.from({ length: hoursLimit + 1 }, (_, index) => index), [hoursLimit])
  const minuteSecondOptions = useMemo(() => Array.from({ length: 60 }, (_, index) => index), [])

  const handlePartChange = useCallback(
    (part: "hours" | "minutes" | "seconds", nextValue: number) => {
      const clampedHours = part === "hours" ? Math.max(0, Math.min(hoursLimit, nextValue)) : parts.hours
      const clampedMinutes = part === "minutes" ? Math.max(0, Math.min(59, nextValue)) : parts.minutes
      const clampedSeconds = part === "seconds" ? Math.max(0, Math.min(59, nextValue)) : parts.seconds
      const total = clampedHours * 3600 + clampedMinutes * 60 + clampedSeconds
      onChange(total)
    },
    [hoursLimit, onChange, parts.hours, parts.minutes, parts.seconds],
  )

  return (
    <div className={cn("flex items-start justify-center gap-6", className)}>
      <TimerWheelColumn
        label="Hours"
        value={Math.min(parts.hours, hoursLimit)}
        options={hourOptions}
        onSelect={(next) => handlePartChange("hours", next)}
      />
      <TimerWheelColumn
        label="Minutes"
        value={parts.minutes}
        options={minuteSecondOptions}
        onSelect={(next) => handlePartChange("minutes", next)}
      />
      <TimerWheelColumn
        label="Seconds"
        value={parts.seconds}
        options={minuteSecondOptions}
        onSelect={(next) => handlePartChange("seconds", next)}
      />
    </div>
  )
}

export default TimerWheel

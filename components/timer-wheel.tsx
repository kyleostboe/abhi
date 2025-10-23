"use client"

import type React from "react"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react"

import { cn } from "@/lib/utils"

const ITEM_HEIGHT = 40
const PADDING_ITEMS = 1

interface TimerWheelColumnProps {
  label: string
  suffix: string
  value: number
  options: number[]
  onSelect: (value: number) => void
}

const padNumber = (value: number) => value.toString().padStart(2, "0")

const TimerWheelColumn: React.FC<TimerWheelColumnProps> = ({ label, suffix, value, options, onSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasMountedRef = useRef(false)

  const baseOptions = useMemo(() => (options.length > 0 ? options : [0]), [options])
  const extendedOptions = useMemo(() => [...baseOptions, ...baseOptions, ...baseOptions], [baseOptions])
  const baseIndex = baseOptions.length
  const activeBaseIndex = useMemo(() => {
    const nextIndex = baseOptions.indexOf(value)
    return nextIndex >= 0 ? nextIndex : 0
  }, [baseOptions, value])

  const alignToValue = useCallback(
    (nextValue: number, behavior: ScrollBehavior = "smooth") => {
      if (!containerRef.current || baseOptions.length === 0) {
        return
      }
      const nextIndex = baseOptions.indexOf(nextValue)
      const targetIndex = (nextIndex >= 0 ? nextIndex : 0) + baseIndex
      const scrollTop = targetIndex * ITEM_HEIGHT
      containerRef.current.scrollTo({ top: scrollTop, behavior })
    },
    [baseIndex, baseOptions],
  )

  useLayoutEffect(() => {
    if (!containerRef.current || baseOptions.length === 0) return

    const nextIndex = baseOptions.indexOf(value)
    const targetIndex = (nextIndex >= 0 ? nextIndex : 0) + baseIndex
    const scrollTop = targetIndex * ITEM_HEIGHT

    if (!hasMountedRef.current) {
      containerRef.current.scrollTop = scrollTop
      hasMountedRef.current = true
    }
  }, [value, baseOptions, baseIndex])

  useEffect(() => {
    if (!hasMountedRef.current) return
    alignToValue(value, "smooth")
  }, [alignToValue, value])

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      const target = event.currentTarget
      scrollTimeoutRef.current = setTimeout(() => {
        const modulo = baseOptions.length
        if (modulo === 0) {
          return
        }

        const rawIndex = Math.round(target.scrollTop / ITEM_HEIGHT)
        const clampedIndex = Math.max(0, Math.min(rawIndex, extendedOptions.length - 1))
        const normalizedIndex = ((clampedIndex % modulo) + modulo) % modulo
        const option = baseOptions[normalizedIndex]

        if (option !== value) {
          onSelect(option)
        }
        alignToValue(option, "auto")
      }, 80)
    },
    [alignToValue, baseOptions, extendedOptions.length, onSelect, value],
  )

  const handleOptionClick = useCallback(
    (option: number) => {
      if (option !== value) {
        onSelect(option)
      }
      alignToValue(option)
    },
    [alignToValue, onSelect, value],
  )

  return (
    <div className="flex w-14 flex-col items-center">
      <div className="relative w-full h-auto">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          role="listbox"
          aria-label={label}
          className="overflow-y-auto rounded-xl bg-transparent"
          style={{
            height: ITEM_HEIGHT * 3,
            scrollSnapType: "y mandatory",
            scrollPaddingTop: ITEM_HEIGHT * PADDING_ITEMS,
            scrollPaddingBottom: ITEM_HEIGHT * PADDING_ITEMS,
            paddingTop: ITEM_HEIGHT * PADDING_ITEMS,
            paddingBottom: ITEM_HEIGHT * PADDING_ITEMS,
          }}
        >
          {extendedOptions.map((option, index) => {
            const isActive = option === value
            return (
              <button
                key={`${option}-${index}`}
                type="button"
                role="option"
                aria-selected={isActive}
                className={cn(
                  "flex w-full items-end justify-center px-1 transition-all duration-150",
                  "focus:outline-none",
                  isActive ? "text-gray-600" : "text-gray-300",
                )}
                style={{ height: ITEM_HEIGHT, scrollSnapAlign: "center" }}
                onClick={() => handleOptionClick(option)}
              >
                <span
                  className={cn(
                    "font-serif font-black leading-none tracking-tight transition-all duration-150",
                    isActive ? "text-2xl" : "text-sm text-gray-400",
                  )}
                >
                  {padNumber(option)}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <span className="pb-1 font-serif text-xs font-semibold uppercase tracking-wide text-gray-500 mt-8">{suffix}</span>
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
  const hoursLimit = useMemo(() => Math.max(maxHours, parts.hours), [maxHours, parts.hours])
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
    <div className={cn("flex items-center justify-center gap-0", className)}>
      <TimerWheelColumn
        label="Hours"
        suffix="hr"
        value={Math.min(parts.hours, hoursLimit)}
        options={hourOptions}
        onSelect={(next) => handlePartChange("hours", next)}
      />
      <span className="mt-1 text-2xl font-serif font-black text-gray-400 -mx-2">:</span>
      <TimerWheelColumn
        label="Minutes"
        suffix="min"
        value={parts.minutes}
        options={minuteSecondOptions}
        onSelect={(next) => handlePartChange("minutes", next)}
      />
      <span className="mt-1 text-2xl font-serif font-black text-gray-400 -mx-2">:</span>
      <TimerWheelColumn
        label="Seconds"
        suffix="sec"
        value={parts.seconds}
        options={minuteSecondOptions}
        onSelect={(next) => handlePartChange("seconds", next)}
      />
    </div>
  )
}

export default TimerWheel

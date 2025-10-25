"use client"

import type React from "react"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"

const ITEM_HEIGHT = 32
const VISIBLE_ITEMS = 3 // Show 1 above, selected, 1 below
const COLUMN_CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS // 96px

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
  const alignRafRef = useRef<number | null>(null)
  const hasMountedRef = useRef(false)

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      if (alignRafRef.current !== null) {
        cancelAnimationFrame(alignRafRef.current)
      }
    }
  }, [])

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

  const computeScrollState = useCallback(
    (scrollTop: number) => {
      const modulo = baseOptions.length

      if (modulo === 0) {
        return {
          normalizedIndex: 0,
          clampedIndex: baseIndex,
          option: baseOptions[0] ?? 0,
          targetScrollTop: baseIndex * ITEM_HEIGHT,
        }
      }

      const rawIndex = Math.round(scrollTop / ITEM_HEIGHT)
      const clampedIndex = Math.max(0, Math.min(rawIndex, extendedOptions.length - 1))
      const normalizedIndex = ((clampedIndex % modulo) + modulo) % modulo
      const option = baseOptions[normalizedIndex]
      const targetScrollTop = (normalizedIndex + baseIndex) * ITEM_HEIGHT

      return { normalizedIndex, clampedIndex, option, targetScrollTop }
    },
    [baseIndex, baseOptions, extendedOptions.length],
  )

  const [activeExtendedIndex, setActiveExtendedIndex] = useState(baseIndex + activeBaseIndex)

  useEffect(() => {
    setActiveExtendedIndex(baseIndex + activeBaseIndex)
  }, [activeBaseIndex, baseIndex])

  useLayoutEffect(() => {
    if (!containerRef.current || baseOptions.length === 0) return

    if (hasMountedRef.current) {
      alignToValue(value, "smooth")
    } else {
      alignToValue(value, "auto")
      hasMountedRef.current = true
    }
  }, [alignToValue, baseOptions.length, value])

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      const target = event.currentTarget
      const { clampedIndex: immediateIndex } = computeScrollState(target.scrollTop)
      setActiveExtendedIndex(immediateIndex)

      scrollTimeoutRef.current = setTimeout(() => {
        const { normalizedIndex, clampedIndex, option, targetScrollTop } = computeScrollState(target.scrollTop)

        setActiveExtendedIndex(clampedIndex)

        if (option !== value) {
          onSelect(option)
        }
        const hasDifferentOffset = Math.abs(target.scrollTop - targetScrollTop) > 0.5

        if (hasDifferentOffset) {
          if (alignRafRef.current !== null) {
            cancelAnimationFrame(alignRafRef.current)
          }
          alignRafRef.current = requestAnimationFrame(() => {
            alignRafRef.current = null
            alignToValue(option)
          })
        }
      }, 80)
    },
    [alignToValue, computeScrollState, onSelect, value],
  )

  const handleOptionClick = useCallback(
    (option: number) => {
      const nextIndex = baseOptions.indexOf(option)
      if (nextIndex >= 0) {
        setActiveExtendedIndex(baseIndex + nextIndex)
      }
      if (option !== value) {
        onSelect(option)
      }
      alignToValue(option)
    },
    [alignToValue, baseIndex, baseOptions, onSelect, value],
  )

  return (
    <div className="flex flex-col items-center w-11">
      <div className="relative w-full h-auto">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          role="listbox"
          aria-label={label}
          className="overflow-y-auto scrollbar-none rounded-xl bg-transparent"
          style={{
            height: COLUMN_CONTAINER_HEIGHT,
            scrollSnapType: "y mandatory",
          }}
        >
          <div style={{ height: ITEM_HEIGHT }} aria-hidden="true" />
          {extendedOptions.map((option, index) => {
            const isActive = index === activeExtendedIndex
            return (
              <button
                key={`${option}-${index}`}
                type="button"
                role="option"
                aria-selected={option === value}
                className={cn(
                  "flex w-full items-center justify-center transition-all duration-150 px-2",
                  "focus:outline-none",
                  isActive ? "text-gray-600" : "text-gray-400",
                )}
                style={{ height: ITEM_HEIGHT, scrollSnapAlign: "center" }}
                onClick={() => handleOptionClick(option)}
              >
                <span
                  className={cn(
                    "font-serif font-black leading-none tracking-tight transition-all duration-150",
                    isActive ? "text-lg text-gray-600" : "text-xs text-stone-300",
                  )}
                >
                  {padNumber(option)}
                </span>
              </button>
            )
          })}
          <div style={{ height: ITEM_HEIGHT }} aria-hidden="true" />
        </div>
      </div>
      <span className="font-serif font-black lowercase tracking-wide text-stone-500 border-0 border-stone-500 px-[3px] border-b-0 text-sm mt-1.5">
        {suffix}
      </span>
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
    <div className={cn("flex items-center justify-center gap-[3px]", className)}>
      <TimerWheelColumn
        label="Hours"
        suffix="hr"
        value={Math.min(parts.hours, hoursLimit)}
        options={hourOptions}
        onSelect={(next) => handlePartChange("hours", next)}
      />
      <span
        className="flex items-center justify-center font-serif font-black text-gray-600 text-2xl pb-8"
        style={{ height: COLUMN_CONTAINER_HEIGHT }}
      >
        :
      </span>
      <TimerWheelColumn
        label="Minutes"
        suffix="min"
        value={parts.minutes}
        options={minuteSecondOptions}
        onSelect={(next) => handlePartChange("minutes", next)}
      />
      <span
        className="flex items-center justify-center font-serif font-black text-gray-600 text-2xl pb-8"
        style={{ height: COLUMN_CONTAINER_HEIGHT }}
      >
        :
      </span>
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

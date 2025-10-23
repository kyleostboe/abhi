"use client"

import type React from "react"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

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
          option: baseOptions[0] ?? 0,
          targetScrollTop: baseIndex * ITEM_HEIGHT,
        }
      }

      const rawIndex = Math.round(scrollTop / ITEM_HEIGHT)
      const clampedIndex = Math.max(0, Math.min(rawIndex, extendedOptions.length - 1))
      const normalizedIndex = ((clampedIndex % modulo) + modulo) % modulo
      const option = baseOptions[normalizedIndex]
      const targetScrollTop = (normalizedIndex + baseIndex) * ITEM_HEIGHT

      return { normalizedIndex, option, targetScrollTop }
    },
    [baseIndex, baseOptions, extendedOptions.length],
  )

  const [activeIndex, setActiveIndex] = useState(activeBaseIndex)

  useEffect(() => {
    setActiveIndex(activeBaseIndex)
  }, [activeBaseIndex])

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
      const { normalizedIndex: immediateIndex } = computeScrollState(target.scrollTop)
      setActiveIndex(immediateIndex)

      scrollTimeoutRef.current = setTimeout(() => {
        const { normalizedIndex, option, targetScrollTop } = computeScrollState(target.scrollTop)

        setActiveIndex(normalizedIndex)

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
        setActiveIndex(nextIndex)
      }
      if (option !== value) {
        onSelect(option)
      }
      alignToValue(option)
    },
    [alignToValue, baseOptions, onSelect, value],
  )

  return (
    <div className="flex w-14 flex-col items-center">
      <div className="relative w-full h-auto">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          role="listbox"
          aria-label={label}
          className="overflow-y-scroll scrollbar-none rounded-xl bg-transparent"
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
            const optionIndex = baseOptions.length === 0 ? 0 : index % baseOptions.length
            const isActive = optionIndex === activeIndex
            return (
              <button
                key={`${option}-${index}`}
                type="button"
                role="option"
                aria-selected={option === value}
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

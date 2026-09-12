"use client"

import type React from "react"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"

const ITEM_HEIGHT = 32
const VISIBLE_ITEMS = 3 // one above the selection, the selection, one below
const COLUMN_CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS // 96px

/**
 * The digits' box, and the unit slot beside it.
 *
 * Both are fixed rather than sized to their own contents, and that is the whole point of this
 * layout. "hr", "min" and "sec" are three different lengths, so a content-sized label gives the
 * three columns three different widths — the columns then sit at uneven distances from each other
 * and the numbers stop reading as a grid. Fixed slots make every column the same width, so the
 * units can be as ragged as they like inside it without moving the digits.
 */
const DIGITS_WIDTH = 40
const UNIT_WIDTH = 28

/**
 * How the digits and their unit are spaced, and how the columns are spaced from each other.
 *
 * The unit names its own column, so it has to sit nearer to its own digits than to the next
 * column's — otherwise the eye pairs "10" with "sec" instead of with "min". A 2px gap inside the
 * group against 16px between groups says that without anything drawn between them.
 */
const GROUP_GAP = "gap-0.5"
const COLUMN_GAP = "gap-4"

/**
 * The row's left padding, and the reason it needs one.
 *
 * A column is `[digits][gap][unit]`, so its digits sit half a unit left of the column's own
 * centre — and three identical columns put the row's centre on the middle column's centre.
 * `justify-center` therefore centres the *units* and leaves the middle column's numbers 15px left
 * of the page's centre line, which is the one thing above them that is centred.
 *
 * Padding the row by the width those trailing units occupy — 28px of unit plus the 2px `gap-0.5`
 * inside every column — moves the whole row half of that distance right, which is exactly the 15px
 * the numbers were missing. Reserving the unit's width on a column's left instead would centre the
 * digits without the nudge, but it would also push the three columns 30px further apart, and the
 * spacing between them is the part of this that was rebuilt to be right.
 */
const DIGITS_CENTER_PAD = "pl-[30px]"

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

  // Three copies of the options, so a column can keep scrolling past either end and be re-centred
  // on the middle copy without ever hitting the boundary.
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
      // The list carries one spacer row at each end, so an item's own top is exactly one row below
      // where the scroller has to land for that item to sit in the middle of the window.
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
      const scrollTop = target.scrollTop

      // The emphasis follows the finger, not the commit, so the large digit is under the snap
      // point the moment the column stops rather than one settle later.
      const rawIndex = Math.round(scrollTop / ITEM_HEIGHT)
      const clampedIndex = Math.max(0, Math.min(rawIndex, extendedOptions.length - 1))
      setActiveExtendedIndex(clampedIndex)

      scrollTimeoutRef.current = setTimeout(() => {
        const { clampedIndex, option, targetScrollTop } = computeScrollState(scrollTop)

        setActiveExtendedIndex(clampedIndex)

        if (option !== value) {
          onSelect(option)
        }
        const hasDifferentOffset = Math.abs(scrollTop - targetScrollTop) > 0.5

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
    [alignToValue, computeScrollState, extendedOptions.length, onSelect, value],
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
    <div className={cn("flex items-center", GROUP_GAP)}>
      <div className="relative" style={{ width: DIGITS_WIDTH }}>
        <div
          ref={containerRef}
          onScroll={handleScroll}
          role="listbox"
          aria-label={label}
          // `overscroll-contain` stops a flick that runs out of numbers from carrying on into the
          // page behind it — the tool pages scroll, and the wheel is a small target to catch.
          className="overflow-y-auto overscroll-contain scrollbar-none bg-transparent"
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
                className="flex w-full items-center justify-center focus:outline-none"
                style={{ height: ITEM_HEIGHT, scrollSnapAlign: "center" }}
                onClick={() => handleOptionClick(option)}
              >
                <span
                  className={cn(
                    // Emphasis is a scale rather than a font size: the row is a fixed 32px, and
                    // swapping sizes would re-flow the row and make the column jump as the
                    // selection moves. Scaling changes what is painted and nothing else.
                    "inline-block origin-center font-serif text-base font-black leading-none tracking-tight tabular-nums",
                    "transition-[transform,color] duration-200 ease-out",
                    isActive ? "scale-150 text-gray-600" : "scale-75 text-stone-400",
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
      {/* Outside the scroller, so the unit holds still while the digits travel past it — inside the
          rows it rode along with them. `leading-none` is what lines it up with the selected digit:
          both then sit on their own cap height, and no nudge is needed to centre them. */}
      <span
        className="flex items-center font-serif text-xs font-black lowercase leading-none tracking-wide text-stone-400"
        style={{ width: UNIT_WIDTH }}
      >
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
    <div className={cn("flex items-center justify-center", COLUMN_GAP, DIGITS_CENTER_PAD, className)}>
      <TimerWheelColumn
        label="Hours"
        suffix="hr"
        value={Math.min(parts.hours, hoursLimit)}
        options={hourOptions}
        onSelect={(next) => handlePartChange("hours", next)}
      />
      <TimerWheelColumn
        label="Minutes"
        suffix="min"
        value={parts.minutes}
        options={minuteSecondOptions}
        onSelect={(next) => handlePartChange("minutes", next)}
      />
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

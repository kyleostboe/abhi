"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, Copy } from 'lucide-react'
import { cn, formatTime } from "@/lib/utils"
import type { TimelineEvent } from "@/lib/types"
import { EVENT_COLORS } from "@/lib/constants"

interface VisualTimelineProps {
  events: TimelineEvent[]
  totalDuration: number // in seconds
  onUpdateEvent: (id: string, newTime: number) => void
  onRemoveEvent: (id: string) => void
  onDuplicateEvent: (event: TimelineEvent) => void
}

const MIN_EVENT_WIDTH_PX = 50 // Minimum width for an event card to be visible/draggable

export function VisualTimeline({
  events,
  totalDuration,
  onUpdateEvent,
  onRemoveEvent,
  onDuplicateEvent,
}: VisualTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState(0) // Offset from mouse to event's left edge
  const [timelineWidth, setTimelineWidth] = useState(0)

  useEffect(() => {
    const handleResize = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.offsetWidth)
      }
    }

    handleResize() // Set initial width
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const pixelsPerSecond = timelineWidth > 0 ? timelineWidth / totalDuration : 0

  const handleDragStart = useCallback(
    (event: React.MouseEvent | React.TouchEvent, eventId: string, currentStartTime: number) => {
      if (!timelineRef.current) return

      setIsDragging(true)
      setDraggedEventId(eventId)

      const clientX = "touches" in event ? event.touches[0].clientX : event.clientX
      const timelineRect = timelineRef.current.getBoundingClientRect()
      const eventCard = event.currentTarget as HTMLElement
      const eventRect = eventCard.getBoundingClientRect()

      // Calculate offset from mouse position to the left edge of the event card
      setDragOffset(clientX - eventRect.left)

      // Prevent default drag behavior for touch events to avoid scrolling
      if ("touches" in event) {
        event.preventDefault()
      }
    },
    [],
  )

  const handleDrag = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!isDragging || !draggedEventId || !timelineRef.current) return

      const clientX = "touches" in event ? event.touches[0].clientX : event.clientX
      const timelineRect = timelineRef.current.getBoundingClientRect()

      // Calculate new position relative to the timeline's left edge
      const newX = clientX - timelineRect.left - dragOffset

      // Convert pixels to seconds
      let newStartTime = newX / pixelsPerSecond

      // Clamp newStartTime within valid range [0, totalDuration - eventDuration]
      const draggedEvent = events.find((e) => e.id === draggedEventId)
      const eventDuration = draggedEvent?.duration || 0 // Assuming duration is in seconds
      newStartTime = Math.max(0, Math.min(newStartTime, totalDuration - eventDuration))

      onUpdateEvent(draggedEventId, newStartTime)
    },
    [isDragging, draggedEventId, dragOffset, pixelsPerSecond, totalDuration, events, onUpdateEvent],
  )

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    setDraggedEventId(null)
    setDragOffset(0)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDrag)
      window.addEventListener("mouseup", handleDragEnd)
      window.addEventListener("touchmove", handleDrag, { passive: false })
      window.addEventListener("touchend", handleDragEnd)
    } else {
      window.removeEventListener("mousemove", handleDrag)
      window.removeEventListener("mouseup", handleDragEnd)
      window.removeEventListener("touchmove", handleDrag)
      window.removeEventListener("touchend", handleDragEnd)
    }
    return () => {
      window.removeEventListener("mousemove", handleDrag)
      window.removeEventListener("mouseup", handleDragEnd)
      window.removeEventListener("touchmove", handleDrag)
      window.removeEventListener("touchend", handleDragEnd)
    }
  }, [isDragging, handleDrag, handleDragEnd])

  const handleTimeInputChange = useCallback(
    (eventId: string, value: string) => {
      const newTime = parseFloat(value)
      if (!isNaN(newTime)) {
        onUpdateEvent(eventId, newTime)
      }
    },
    [onUpdateEvent],
  )

  const sortedEvents = [...events].sort((a, b) => a.startTime - b.startTime)

  return (
    <div className="space-y-6">
      <div className="relative h-24 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-inner overflow-hidden">
        <div
          ref={timelineRef}
          className="absolute inset-0 flex items-center"
          style={{ width: "100%", height: "100%" }}
        >
          {pixelsPerSecond > 0 && (
            <>
              {/* Background grid lines for seconds */}
              {Array.from({ length: Math.floor(totalDuration) }).map((_, i) => (
                <div
                  key={`second-line-${i}`}
                  className="absolute top-0 bottom-0 border-l border-gray-200 dark:border-gray-700"
                  style={{ left: `${i * pixelsPerSecond}px`, height: "100%" }}
                />
              ))}
              {/* Background grid lines for minutes */}
              {Array.from({ length: Math.floor(totalDuration / 60) }).map((_, i) => (
                <div
                  key={`minute-line-${i}`}
                  className="absolute top-0 bottom-0 border-l-2 border-gray-300 dark:border-gray-600"
                  style={{ left: `${i * 60 * pixelsPerSecond}px`, height: "100%" }}
                >
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400">
                    {i}m
                  </span>
                </div>
              ))}
            </>
          )}

          <AnimatePresence>
            {sortedEvents.map((event) => {
              const eventWidth = Math.max(MIN_EVENT_WIDTH_PX, (event.duration || 1) * pixelsPerSecond)
              const leftPosition = event.startTime * pixelsPerSecond

              return (
                <motion.div
                  key={event.id}
                  layoutId={event.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 h-16 rounded-md shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center text-white text-xs font-bold overflow-hidden whitespace-nowrap",
                    event.color || EVENT_COLORS[0], // Use event's color or default
                  )}
                  style={{
                    left: `${leftPosition}px`,
                    width: `${eventWidth}px`,
                    zIndex: draggedEventId === event.id ? 50 : 1,
                  }}
                  onMouseDown={(e) => handleDragStart(e, event.id, event.startTime)}
                  onTouchStart={(e) => handleDragStart(e, event.id, event.startTime)}
                >
                  <span className="px-2 truncate">
                    {event.type === "instruction_sound"
                      ? event.instructionText
                      : event.recordedInstructionLabel || "Recorded Voice"}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-4">
        {sortedEvents.map((event) => (
          <motion.div
            key={event.id}
            layoutId={`card-${event.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <Card className="flex items-center p-4 shadow-md dark:shadow-white/10">
              <CardContent className="flex-1 p-0 flex items-center space-x-4">
                <div
                  className={cn(
                    "w-4 h-4 rounded-full flex-shrink-0",
                    event.color || EVENT_COLORS[0], // Use event's color or default
                  )}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {event.type === "instruction_sound"
                      ? event.instructionText
                      : event.recordedInstructionLabel || "Recorded Voice"}
                  </p>
                  {event.type === "instruction_sound" && event.soundCueName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sound: {event.soundCueName}</p>
                  )}
                  {event.type === "recorded_voice" && event.duration && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Duration: {formatTime(event.duration)}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    value={event.startTime.toFixed(1)}
                    onChange={(e) => handleTimeInputChange(event.id, e.target.value)}
                    className="w-24 text-center text-sm dark:bg-gray-800 dark:text-gray-200"
                    step="0.1"
                    min="0"
                    max={totalDuration.toString()}
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">s</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDuplicateEvent(event)}
                  className="text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
                  title="Duplicate Event"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveEvent(event.id)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600"
                  title="Remove Event"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

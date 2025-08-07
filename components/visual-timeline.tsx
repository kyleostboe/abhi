"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

export function VisualTimeline({
  events,
  totalDuration,
  onUpdateEvent,
  onRemoveEvent,
  onDuplicateEvent,
}: VisualTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const [timelineWidth, setTimelineWidth] = useState(0)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragStartX, setDragStartX] = useState(0)
  const [initialEventTime, setInitialEventTime] = useState(0)

  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.offsetWidth)
      }
    }
    updateWidth()
    window.addEventListener("resize", updateWidth)
    return () => window.removeEventListener("resize", updateWidth)
  }, [])

  const pixelsPerSecond = timelineWidth / totalDuration

  const handleDragStart = useCallback(
    (event: React.MouseEvent | React.TouchEvent, eventId: string, currentStartTime: number) => {
      setDraggingId(eventId)
      setInitialEventTime(currentStartTime)
      if ("touches" in event) {
        setDragStartX(event.touches[0].clientX)
      } else {
        setDragStartX(event.clientX)
      }
      event.currentTarget.setPointerCapture?.((event as React.MouseEvent).pointerId);
    },
    []
  );

  const handleDrag = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (!draggingId || !timelineRef.current) return;

      let clientX: number;
      if ("touches" in event) {
        clientX = event.touches[0].clientX;
      } else {
        clientX = event.clientX;
      }

      const deltaX = clientX - dragStartX;
      const deltaSeconds = deltaX / pixelsPerSecond;
      let newTime = initialEventTime + deltaSeconds;

      // Clamp newTime to stay within bounds [0, totalDuration]
      newTime = Math.max(0, Math.min(newTime, totalDuration));

      onUpdateEvent(draggingId, newTime);
    },
    [draggingId, dragStartX, initialEventTime, pixelsPerSecond, totalDuration, onUpdateEvent]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  const getEventPosition = useCallback(
    (startTime: number) => {
      return (startTime / totalDuration) * 100; // Percentage
    },
    [totalDuration]
  );

  return (
    <div className="space-y-6">
      <div className="relative h-12 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
        <div ref={timelineRef} className="absolute inset-0 flex items-center">
          {/* Timeline markers */}
          {Array.from({ length: Math.floor(totalDuration / 60) + 1 }).map((_, i) => (
            <div
              key={`marker-${i}`}
              className="absolute h-full border-l border-gray-300 dark:border-gray-600 flex flex-col justify-center items-center"
              style={{ left: `${(i * 60 / totalDuration) * 100}%` }}
            >
              <span className="absolute -bottom-6 text-xs text-gray-500 dark:text-gray-400">
                {i} min
              </span>
            </div>
          ))}

          {/* Events on timeline */}
          <AnimatePresence>
            {events.map((event) => (
              <motion.div
                key={event.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={cn(
                  "absolute h-8 w-8 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-md border-2",
                  event.color || EVENT_COLORS[0] // Use event.color or default
                )}
                style={{
                  left: `${getEventPosition(event.startTime)}%`,
                  x: "-50%", // Center the dot on its position
                  zIndex: draggingId === event.id ? 50 : 10,
                }}
                onPointerDown={(e) => handleDragStart(e, event.id, event.startTime)}
                onPointerMove={handleDrag}
                onPointerUp={handleDragEnd}
                onPointerCancel={handleDragEnd}
                onPointerLeave={handleDragEnd} // Added to handle cases where pointer leaves the element
                title={`${event.type === "instruction_sound" ? event.instructionText : event.recordedInstructionLabel} at ${formatTime(event.startTime)}`}
              >
                {event.type === "instruction_sound" ? (
                  <Music2 className="h-4 w-4 text-white" />
                ) : (
                  <Mic className="h-4 w-4 text-white" />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Event List */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {events.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 font-serif font-black text-sm py-4">
            No events added yet. Add instructions or recordings above!
          </p>
        )}
        <AnimatePresence initial={false}>
          {events.map((event) => (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <Card className="p-4 flex items-center space-x-4 bg-white dark:bg-gray-900 shadow-md dark:shadow-white/10 border-none">
                <div className={cn(
                  "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center",
                  event.color || EVENT_COLORS[0] // Use event.color or default
                )}>
                  {event.type === "instruction_sound" ? (
                    <Music2 className="h-5 w-5 text-white" />
                  ) : (
                    <Mic className="h-5 w-5 text-white" />
                  )}
                </div>
                <div className="flex-1 grid gap-1">
                  <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                    {event.type === "instruction_sound" ? event.instructionText : event.recordedInstructionLabel}
                  </p>
                  {event.type === "instruction_sound" && event.soundCueName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sound: {event.soundCueName}</p>
                  )}
                  {event.type === "recorded_voice" && event.duration && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Duration: {formatTime(event.duration)}</p>
                  )}
                </div>
                <div className="w-24">
                  <Label htmlFor={`time-${event.id}`} className="sr-only">Start Time</Label>
                  <Input
                    id={`time-${event.id}`}
                    type="number"
                    value={Math.round(event.startTime)}
                    onChange={(e) => onUpdateEvent(event.id, Number(e.target.value))}
                    className="w-full text-center text-sm font-mono bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                    min={0}
                    max={totalDuration}
                    step={1}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                    {formatTime(event.startTime)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDuplicateEvent(event)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    title="Duplicate Event"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveEvent(event.id)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
                    title="Remove Event"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

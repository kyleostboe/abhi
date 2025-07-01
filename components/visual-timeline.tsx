"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, Music2Icon, MicIcon, Check, X, Play } from "lucide-react"
import { SOUND_CUES_LIBRARY, generateSyntheticSound } from "../lib/meditation-data"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface TimelineEvent {
  id: string
  type: "instruction_sound" | "recorded_voice"
  startTime: number
  instructionText?: string
  soundCueId?: string
  recordedAudioUrl?: string
  recordedInstructionLabel?: string
  duration?: number
}

interface VisualTimelineProps {
  events: TimelineEvent[]
  totalDuration: number
  onUpdateEvent: (eventId: string, newStartTime: number) => void
  onRemoveEvent: (eventId: string) => void
}

const EVENT_COLORS = [
  "bg-gradient-to-br from-logo-amber-500 to-logo-amber-600",
  "bg-gradient-to-br from-logo-rose-500 to-logo-rose-600",
  "bg-gradient-to-br from-logo-purple-500 to-logo-purple-600",
  "bg-gradient-to-br from-logo-blue-500 to-logo-blue-600",
  "bg-gradient-to-br from-logo-teal-500 to-logo-teal-600",
  "bg-gradient-to-br from-logo-emerald-500 to-logo-emerald-600",
  "bg-gradient-to-br from-pink-500 to-pink-600",
  "bg-gradient-to-br from-orange-500 to-orange-600",
]

const getEventColor = (eventId: string, events: TimelineEvent[]) => {
  // Create a stable mapping based on event IDs sorted alphabetically
  // This ensures colors stay consistent regardless of timeline reordering
  const sortedEventIds = [...events].map((e) => e.id).sort()
  const index = sortedEventIds.indexOf(eventId)
  return EVENT_COLORS[index % EVENT_COLORS.length]
}

const getInitialPosition = (index: number, totalEvents: number, duration: number) => {
  if (totalEvents === 1) return duration / 2
  const spacing = duration / (totalEvents + 1)
  return spacing * (index + 1)
}

export function VisualTimeline({ events = [], totalDuration, onUpdateEvent, onRemoveEvent }: VisualTimelineProps) {
  // Safety check to ensure events is always an array
  const safeEvents = events || []
  const [draggedEvent, setDraggedEvent] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const timelineRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingTime, setEditingTime] = useState<string>("")
  const [isMobile, setIsMobile] = useState(false)

  // Check for mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 60)
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
  }

  const getTimeFromPosition = useCallback(
    (clientX: number): number => {
      if (!timelineRef.current) return 0
      const rect = timelineRef.current.getBoundingClientRect()
      const relativeX = clientX - rect.left
      const percentage = Math.max(0, Math.min(1, relativeX / rect.width))
      return Math.round(percentage * totalDuration)
    },
    [totalDuration],
  )

  const getPositionFromTime = useCallback(
    (time: number): string => {
      const percentage = (time / totalDuration) * 100
      return `${percentage}%`
    },
    [totalDuration],
  )

  // Handle mouse events
  const handleMouseDown = (eventId: string, e: React.MouseEvent) => {
    e.preventDefault()
    setDraggedEvent(eventId)
    isDragging.current = true

    if (timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect()
      const eventElement = e.currentTarget as HTMLElement
      const eventRect = eventElement.getBoundingClientRect()
      setDragOffset(e.clientX - (eventRect.left + eventRect.width / 2))
    }
  }

  // Handle touch events
  const handleTouchStart = (eventId: string, e: React.TouchEvent) => {
    e.preventDefault()
    setDraggedEvent(eventId)
    isDragging.current = true

    if (timelineRef.current && e.touches[0]) {
      const rect = timelineRef.current.getBoundingClientRect()
      const eventElement = e.currentTarget as HTMLElement
      const eventRect = eventElement.getBoundingClientRect()
      setDragOffset(e.touches[0].clientX - (eventRect.left + eventRect.width / 2))
    }
  }

  // Global mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggedEvent && isDragging.current) {
        const newTime = getTimeFromPosition(e.clientX - dragOffset)
        onUpdateEvent(draggedEvent, newTime)
      }
    }

    const handleMouseUp = () => {
      setDraggedEvent(null)
      isDragging.current = false
      setDragOffset(0)
    }

    if (draggedEvent) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [draggedEvent, getTimeFromPosition, onUpdateEvent, dragOffset])

  // Global touch move handler
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (draggedEvent && isDragging.current && e.touches[0]) {
        e.preventDefault()
        const newTime = getTimeFromPosition(e.touches[0].clientX - dragOffset)
        onUpdateEvent(draggedEvent, newTime)
      }
    }

    const handleTouchEnd = () => {
      setDraggedEvent(null)
      isDragging.current = false
      setDragOffset(0)
    }

    if (draggedEvent) {
      document.addEventListener("touchmove", handleTouchMove, { passive: false })
      document.addEventListener("touchend", handleTouchEnd)
    }

    return () => {
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [draggedEvent, getTimeFromPosition, onUpdateEvent, dragOffset])

  // Responsive time markers - fewer on mobile
  const timeMarkersCount = isMobile
    ? Math.max(3, Math.min(Math.floor(totalDuration / 120), 5)) // 3-5 markers on mobile
    : Math.max(5, Math.min(Math.floor(totalDuration / 60), 10)) // 5-10 markers on desktop

  const timeMarkers = Array.from({ length: timeMarkersCount + 1 }, (_, i) => (i / timeMarkersCount) * totalDuration)

  const handleTimeEdit = (eventId: string, currentTime: number) => {
    setEditingEventId(eventId)
    setEditingTime(formatTime(currentTime))
  }

  const handleTimeSave = (eventId: string) => {
    const [minutes, seconds] = editingTime.split(":").map(Number)
    const newTime = minutes * 60 + seconds
    onUpdateEvent(eventId, newTime)
    setEditingEventId(null)
    setEditingTime("")
  }

  const handleTimeCancel = () => {
    setEditingEventId(null)
    setEditingTime("")
  }

  const playEventAudio = async (event: TimelineEvent) => {
    try {
      if (event.type === "instruction_sound" && event.soundCueId) {
        const soundCue = SOUND_CUES_LIBRARY.find((s) => s.id === event.soundCueId)
        if (soundCue && soundCue.src.startsWith("synthetic:")) {
          await generateSyntheticSound(soundCue)
        }
      } else if (event.type === "recorded_voice" && event.recordedAudioUrl) {
        // Play recorded audio
        const audio = new Audio(event.recordedAudioUrl)
        audio.volume = 0.7
        await audio.play()
      }
    } catch (error) {
      console.warn("Audio playback failed:", error)
    }
  }

  const getEventDuration = (event: TimelineEvent): number => {
    if (event.type === "recorded_voice" && event.recordedAudioUrl) {
      return event.duration || 0
    }
    return 0
  }

  return (
    <div className="space-y-6 select-none">
      {/* Time Markers */}
      <div className="relative">
        {/* Timeline Bar */}
        <div
          ref={timelineRef}
          className="relative h-20 bg-gradient-to-r from-gray-100/70 to-gray-200/70 dark:from-gray-800/70 dark:to-gray-900/70 rounded-2xl dark:border-gray-700 cursor-pointer overflow-visible border-4 border-gray-200 dark:shadow-white/30 shadow-lg"
        >
          {/* Background Grid Lines - excluding first and last */}
          {timeMarkers.slice(1, -1).map((time, index) => (
            <div
              key={`grid-${index}`}
              className="absolute top-0 bottom-0 w-px bg-logo-teal-200/50 dark:bg-logo-teal-700/50"
              style={{ left: getPositionFromTime(time) }}
            />
          ))}

          {/* Events on Timeline */}
          <AnimatePresence>
            {safeEvents.map((event, index) => {
              // Only use initial positioning for truly new events that haven't been positioned yet
              // and when there are multiple events at the exact same time (collision detection)
              const eventsAtSameTime = safeEvents.filter((e) => e.startTime === event.startTime)
              const shouldUseInitialPosition =
                event.startTime === 0 && eventsAtSameTime.length > 1 && draggedEvent !== event.id // Don't use initial position if this event is being dragged

              const displayTime = shouldUseInitialPosition
                ? getInitialPosition(index, safeEvents.length, totalDuration)
                : event.startTime

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-md dark:shadow-white/20 cursor-grab active:cursor-grabbing flex items-center justify-center text-white",
                    draggedEvent === event.id ? "z-30 shadow-lg dark:shadow-white/30 ring-2 ring-white/50" : "z-10",
                    getEventColor(event.id, safeEvents),
                  )}
                  style={{
                    left: `calc(${getPositionFromTime(displayTime)} - 20px)`,
                    transform: "translateY(-50%)",
                  }}
                  onMouseDown={(e) => handleMouseDown(event.id, e)}
                  onTouchStart={(e) => handleTouchStart(event.id, e)}
                  title={
                    event.type === "instruction_sound"
                      ? event.instructionText
                      : event.recordedInstructionLabel || "Recorded Voice"
                  }
                >
                  {event.type === "instruction_sound" ? (
                    <Music2Icon className="h-4 w-4" />
                  ) : (
                    <MicIcon className="h-4 w-4" />
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Responsive Time Labels */}
        <div
          className={cn(
            "flex justify-between text-gray-500 dark:text-gray-400 px-2 mt-2 font-black",
            isMobile ? "text-xs" : "text-sm",
          )}
        >
          {timeMarkers.map((time, index) => (
            <div key={`time-${index}`} className="text-center flex flex-col">
              <span
                className={cn(
                  "leading-tight",
                  isMobile && index > 0 && index < timeMarkers.length - 1 ? "hidden sm:block" : "",
                )}
              >
                {isMobile ? Math.floor(time / 60) : formatTime(time)}
              </span>
              {isMobile && (
                <span className="text-xs opacity-60">
                  {index === 0 ? "0m" : index === timeMarkers.length - 1 ? `${Math.floor(totalDuration / 60)}m` : ""}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Event List */}
      <div className="space-y-3">
        <h4 className="text-lg font-black text-gray-800 dark:text-gray-200">Timeline Events</h4>
        <AnimatePresence>
          {safeEvents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 text-gray-500 dark:text-gray-400"
            >
              <div className="text-lg mb-2">No events added yet</div>
              <div className="text-sm">Add instructions and sound cues to build your meditation timeline</div>
            </motion.div>
          ) : (
            safeEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-4 bg-white dark:bg-gray-900 shadow-sm dark:shadow-white/10 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm",
                          getEventColor(event.id, safeEvents),
                        )}
                      >
                        {event.type === "instruction_sound" ? (
                          <Music2Icon className="h-4 w-4" />
                        ) : (
                          <MicIcon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
                          <Badge
                            variant="secondary"
                            className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          >
                            {event.type === "instruction_sound" ? "Instruction + Sound" : "Voice Recording"}
                          </Badge>
                          {editingEventId === event.id ? (
                            <div className="flex items-center space-x-2">
                              <Input
                                value={editingTime}
                                onChange={(e) => setEditingTime(e.target.value)}
                                placeholder="MM:SS"
                                className="w-20 h-6 text-xs"
                                pattern="[0-9]{1,2}:[0-9]{2}"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleTimeSave(event.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={handleTimeCancel} className="h-6 w-6 p-0">
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleTimeEdit(event.id, event.startTime)}
                              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-serif text-xs whitespace-nowrap"
                            >
                              {formatTime(event.startTime)}
                            </button>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 font-black">
                          {event.type === "instruction_sound" ? (
                            <>
                              <span className="font-black">{event.instructionText}</span>
                              {event.soundCueId && (
                                <span className="text-gray-500 dark:text-gray-400 ml-2">
                                  + {SOUND_CUES_LIBRARY.find((s) => s.id === event.soundCueId)?.name}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="font-medium">{event.recordedInstructionLabel}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => playEventAudio(event)}
                        className="hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Preview audio"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRemoveEvent(event.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Remove event"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

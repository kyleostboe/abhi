"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, Music2Icon, MicIcon, Check, X, Play, Copy } from 'lucide-react'
import { SOUND_CUES_LIBRARY, generateSyntheticSound } from "../lib/meditation-data"
import { motion, AnimatePresence } from "framer-motion"
import { cn, formatTime } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { getAudioContext, playNote } from "../lib/audio-utils"
import type { TimelineEvent } from "@/lib/types"
import { useMobile } from "@/hooks/use-mobile"
import { EVENT_COLORS } from "@/lib/constants"

interface VisualTimelineProps {
  events: TimelineEvent[]
  totalDuration: number
  onUpdateEvent: (eventId: string, newStartTime: number) => void
  onRemoveEvent: (eventId: string) => void
  onDuplicateEvent: (event: TimelineEvent) => void
}

const getFromBorderColorClass = (gradientClass: string): string => {
  const match = gradientClass.match(/from-([a-zA-Z0-9-]+)/);
  if (match && match[1]) {
    return `border-${match[1]}`; // e.g., "border-logo-amber-500"
  }
  return "border-gray-500"; // Fallback if no 'from-' color is found
};

export function VisualTimeline({ events, totalDuration, onUpdateEvent, onRemoveEvent, onDuplicateEvent }: VisualTimelineProps) {
  const [draggedEvent, setDraggedEvent] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const timelineRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingTime, setEditingTime] = useState<string>("")
  const isMobile = useMobile()

  const getEventColor = useCallback(
    (event: TimelineEvent) => event.color || EVENT_COLORS[0],
    [],
  )

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

  const timeMarkersCount = isMobile
    ? Math.max(3, Math.min(Math.floor(totalDuration / 120), 5))
    : Math.max(5, Math.min(Math.floor(totalDuration / 60), 10))

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
      if (event.type === "instruction_sound" && event.soundCueSrc) {
        if (event.soundCueSrc.startsWith("synthetic:")) {
          const soundCue = SOUND_CUES_LIBRARY.find((s) => s.id === event.soundCueId)
          if (soundCue) {
            const audioContext = getAudioContext()
            await generateSyntheticSound(soundCue, audioContext)
          }
        } else if (event.soundCueSrc.startsWith("musical:")) {
          const noteMatch = event.soundCueSrc.match(/musical:([A-G])(\d)/)
          if (noteMatch) {
            const note = noteMatch[1]
            const octave = Number.parseInt(noteMatch[2])
            await playNote(note, octave)
          }
        } else {
          const audio = new Audio(event.soundCueSrc)
          audio.volume = 0.7
          await audio.play()
        }
      } else if (event.type === "recorded_voice" && event.recordedAudioUrl) {
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

  const getEventDisplayInfo = (event: TimelineEvent) => {
    if (event.type === "instruction_sound") {
      const soundName = event.soundCueName || SOUND_CUES_LIBRARY.find((cue) => cue.id === event.soundCueId)?.name
      return {
        title: event.instructionText || "Untitled Instruction",
        subtitle: soundName ? `+ ${soundName}` : "Unknown Sound",
        icon: <Music2Icon className="h-4 w-4" />,
      }
    } else {
      return {
        title: event.recordedInstructionLabel || "Untitled Recording",
        subtitle: "Voice Recording",
        icon: <MicIcon className="h-4 w-4" />,
      }
    }
  }

  return (
    <div className="space-y-6 select-none">
      <div className="relative">
        <div
          ref={timelineRef}
          className="relative h-20 bg-gradient-to-r from-gray-100/70 to-gray-200/70 dark:from-gray-800/70 dark:to-gray-900/70 rounded-2xl dark:border-gray-700 cursor-pointer overflow-visible dark:shadow-white/30 shadow-inner border-gray-700 border-0"
        >
          {timeMarkers.slice(1, -1).map((time, index) => (
            <div
              key={`grid-${index}`}
              className="absolute top-0 bottom-0 w-px bg-logo-teal-200/50 dark:bg-logo-teal-700/50"
              style={{ left: getPositionFromTime(time) }}
            />
          ))}

          <AnimatePresence>
            {events.map((event) => {
              const displayTime = event.startTime

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 rounded-full shadow-md dark:shadow-white/20 cursor-grab active:cursor-grabbing flex items-center justify-center text-white w-9 h-9",
                    draggedEvent === event.id ? "z-30 shadow-lg dark:shadow-white/30 ring-2 ring-white/50" : "z-10",
                    getEventColor(event),
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

        <div
          className={cn(
            "flex justify-between dark:text-gray-400 px-2 mt-2 font-black text-gray-600",
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

      <div className="space-y-3 text-left">
        <h4 className="font-black dark:text-gray-200 text-gray-600 text-base">Timeline Events</h4>
        <AnimatePresence>
          {events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 text-gray-500 dark:text-gray-400"
            >
              <div className="mb-2 text-base">No events added yet</div>
              <div className="text-sm">Add instructions and sound cues to build your meditation timeline</div>
            </motion.div>
          ) : (
            events.map((event, index) => {
              const displayInfo = getEventDisplayInfo(event)
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={cn(
                      "p-4 bg-white dark:bg-gray-900 shadow-sm dark:shadow-white/10",
                      "border-2", // Explicitly set border width to 2px
                      getFromBorderColorClass(getEventColor(event)) // Dynamic border color based on icon's primary gradient color
                    )}
                  >
                    <div className="flex items-center w-full">
                      {/* Icon (fixed size, no shrink) */}
                      <div
                        className={cn(
                          "rounded-full flex items-center justify-center text-white shadow-sm h-9 w-9 flex-shrink-0",
                          getEventColor(event),
                        )}
                      >
                        {displayInfo.icon}
                      </div>

                      {/* Text Content (can grow and shrink) */}
                      <div className="flex flex-col flex-grow min-w-0 ml-3"> {/* Removed overflow-hidden from here */}
                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
                          <Badge
                            variant="outline"
                            className="text-xs text-gray-700 dark:text-gray-300 border-none"
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
                              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-serif text-xs ml-0 mr-2"
                            >
                              {formatTime(event.startTime)}
                            </button>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 font-black"> {/* Removed truncate */}
                          <span className="font-black text-gray-600">{displayInfo.title}</span>
                        </div>
                        {event.type === "instruction_sound" && (
                          <p className="text-xs dark:text-gray-400 font-black text-gray-500">{displayInfo.subtitle}</p>
                        )}
                      </div>
                      {/* Button group - now with responsive gap */}
                      <div className="flex items-center gap-x-1 sm:gap-x-3 ml-auto">
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
                          onClick={() => onDuplicateEvent(event)}
                          className="hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Duplicate event"
                        >
                          <Copy className="h-4 w-4" />
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
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

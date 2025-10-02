"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, Music2Icon, MicIcon, Check, X, Play, Copy, Pause } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn, formatTime } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import type { TimelineEvent } from "@/lib/types"
import { useMobile } from "@/hooks/use-mobile"
import { EVENT_COLORS } from "@/lib/constants"

interface VisualTimelineProps {
  events: TimelineEvent[]
  totalDuration: number
  onUpdateEvent: (eventId: string, newStartTime: number) => void
  onRemoveEvent: (eventId: string) => void
  onDuplicateEvent: (event: TimelineEvent) => void
  selectedInstrument?: string
  playSingleNote?: (noteString: string) => Promise<void>
  playChordPreview?: (noteStrings: string[]) => Promise<void>
}

const getFromBorderColorClass = (gradientClass: string): string => {
  const match = gradientClass.match(/from-([a-zA-Z0-9-]+)/)
  if (match && match[1]) {
    return `border-${match[1]}` // e.g., "border-logo-amber-500"
  }
  return "border-gray-500" // Fallback if no 'from-' color is found
}

export function VisualTimeline({
  events,
  totalDuration,
  onUpdateEvent,
  onRemoveEvent,
  onDuplicateEvent,
  selectedInstrument = "piano",
  playSingleNote,
  playChordPreview,
}: VisualTimelineProps) {
  const [draggedEvent, setDraggedEvent] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const timelineRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingTime, setEditingTime] = useState<string>("")
  const [editingDuration, setEditingDuration] = useState<string>("")
  const isMobile = useMobile()
  const [playingEventId, setPlayingEventId] = useState<string | null>(null)
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)

  const parseFlexibleTimeInput = useCallback((value: string): number | null => {
    if (!value) {
      return null
    }

    const trimmedParts = value
      .split(":")
      .map((part) => part.trim())
      .filter((part) => part.length > 0)

    if (trimmedParts.length === 0) {
      return null
    }

    const numericParts = trimmedParts.map((part) => Number(part))

    if (numericParts.some((part) => Number.isNaN(part) || !Number.isFinite(part) || part < 0)) {
      return null
    }

    if (numericParts.length === 3) {
      const [hours, minutes, seconds] = numericParts
      if (minutes >= 60 || seconds >= 60) {
        return null
      }
      return hours * 3600 + minutes * 60 + seconds
    }

    if (numericParts.length === 2) {
      const [minutes, seconds] = numericParts
      if (seconds >= 60) {
        return null
      }
      return minutes * 60 + seconds
    }

    if (numericParts.length === 1) {
      return numericParts[0]
    }

    return null
  }, [])

  useEffect(() => {
    return () => {
      currentAudio?.pause()
    }
  }, [currentAudio])

  const getEventColor = useCallback((event: TimelineEvent) => event.color || EVENT_COLORS[0], [])

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

  const handleMouseDown = (eventId: string, e: React.MouseEvent, timelineEvent: TimelineEvent) => {
    e.preventDefault()
    setDraggedEvent(eventId)
    isDragging.current = true

    if (timelineRef.current) {
      const eventElement = e.currentTarget as HTMLElement
      const eventRect = eventElement.getBoundingClientRect()
      if (timelineEvent.type === "recorded_voice") {
        setDragOffset(e.clientX - eventRect.left)
      } else {
        setDragOffset(e.clientX - (eventRect.left + eventRect.width / 2))
      }
    }
  }

  const handleTouchStart = (eventId: string, e: React.TouchEvent, timelineEvent: TimelineEvent) => {
    e.preventDefault()
    setDraggedEvent(eventId)
    isDragging.current = true

    if (timelineRef.current && e.touches[0]) {
      const eventElement = e.currentTarget as HTMLElement
      const eventRect = eventElement.getBoundingClientRect()
      if (timelineEvent.type === "recorded_voice") {
        setDragOffset(e.touches[0].clientX - eventRect.left)
      } else {
        setDragOffset(e.touches[0].clientX - (eventRect.left + eventRect.width / 2))
      }
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

  const [timelineWidth, setTimelineWidth] = useState(0)

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

  const timeMarkersCount = isMobile
    ? Math.max(3, Math.min(Math.floor(totalDuration / 120), 5))
    : Math.max(5, Math.min(Math.floor(totalDuration / 60), 10))

  const timeMarkers = Array.from({ length: timeMarkersCount + 1 }, (_, i) => (i / timeMarkersCount) * totalDuration)

  const handleTimeEdit = (eventId: string, currentTime: number) => {
    const event = events.find((e) => e.id === eventId)
    setEditingEventId(eventId)
    setEditingTime(formatTime(currentTime))
    if (event?.type === "recorded_voice" && event.duration) {
      setEditingDuration(formatTime(event.duration))
    } else {
      setEditingDuration("")
    }
  }

  const handleTimeSave = (eventId: string) => {
    const event = events.find((timelineEvent) => timelineEvent.id === eventId)
    const parsedTime = parseFlexibleTimeInput(editingTime)

    if (parsedTime === null || parsedTime === undefined) {
      if (event) {
        setEditingTime(formatTime(event.startTime))
        if (event.type === "recorded_voice" && event.duration) {
          setEditingDuration(formatTime(event.duration))
        }
      }
      return
    }

    onUpdateEvent(eventId, parsedTime)
    setEditingEventId(null)
    setEditingTime("")
    setEditingDuration("")
  }

  const handleTimeCancel = () => {
    setEditingEventId(null)
    setEditingTime("")
    setEditingDuration("")
  }

  const playEventAudio = async (event: TimelineEvent) => {
    try {
      if (event.type === "instruction_sound" && event.soundCueSrc) {
        if (event.soundCueSrc.startsWith("synthetic:")) {
          console.log("[v0] Timeline: Synthetic sound playback not available")
        } else if (event.soundCueSrc.startsWith("musical:")) {
          const notesPart = event.soundCueSrc.replace("musical:", "")
          const noteStrings = notesPart.split("|")

          console.log("[v0] Timeline: Playing musical notes:", noteStrings)

          if (noteStrings.length === 1 && playSingleNote) {
            await playSingleNote(noteStrings[0])
          } else if (noteStrings.length > 1 && playChordPreview) {
            await playChordPreview(noteStrings)
          } else if (playSingleNote) {
            for (const noteString of noteStrings) {
              await playSingleNote(noteString)
              await new Promise((resolve) => setTimeout(resolve, 100))
            }
          }
        } else {
          const audio = new Audio(event.soundCueSrc)
          audio.volume = 0.7
          await audio.play()
        }
      } else if (event.type === "recorded_voice" && event.recordedAudioUrl) {
        if (playingEventId === event.id) {
          currentAudio?.pause()
          if (currentAudio) currentAudio.currentTime = 0
          setPlayingEventId(null)
          setCurrentAudio(null)
          return
        }

        if (currentAudio) {
          currentAudio.pause()
          currentAudio.currentTime = 0
        }

        const audio = new Audio(event.recordedAudioUrl)
        audio.volume = 0.7
        audio.onended = () => {
          setPlayingEventId(null)
          setCurrentAudio(null)
        }
        await audio.play()
        setCurrentAudio(audio)
        setPlayingEventId(event.id)
      }
    } catch (error) {
      console.error("[v0] Timeline audio playback failed:", error)
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
      const soundName = event.soundCueName || "Sound Cue"
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

  const circleWidthPx = 36
  const circleHalfTime = timelineWidth > 0 ? (circleWidthPx / 2 / timelineWidth) * totalDuration : 0

  return (
    <div className="space-y-6 select-none">
      <div className="relative">
        <div
          ref={timelineRef}
          className="relative h-20 bg-gradient-to-r from-muted to-gray-200/70 cursor-pointer overflow-visible shadow-inner border-gray-700 border-0 rounded-sm"
        >
          {timeMarkers.slice(1, -1).map((time, index) => (
            <div
              key={`grid-${index}`}
              className="absolute top-0 bottom-0 w-px bg-logo-teal-200/50 "
              style={{ left: getPositionFromTime(time) }}
            />
          ))}

          <AnimatePresence>
            {events.map((event) => {
              let displayTime = event.startTime
              const duration = getEventDuration(event)
              const isRecording = event.type === "recorded_voice"
              const widthPercent = totalDuration > 0 ? (duration / totalDuration) * 100 : 0

              if (isRecording) {
                const prevEvents = events
                  .filter((e) => e.startTime < event.startTime)
                  .sort((a, b) => b.startTime - a.startTime)

                for (const prevEvent of prevEvents) {
                  if (prevEvent.type === "recorded_voice") {
                    const prevEnd = prevEvent.startTime + (prevEvent.duration || 0)
                    if (displayTime < prevEnd) {
                      displayTime = prevEnd
                    }
                  } else {
                    if (displayTime - circleHalfTime < prevEvent.startTime + circleHalfTime) {
                      displayTime = prevEvent.startTime + circleHalfTime * 2
                    }
                  }
                }
              } else {
                const prevRecording = events
                  .filter((e) => e.type === "recorded_voice" && e.startTime < event.startTime)
                  .sort((a, b) => b.startTime - a.startTime)[0]
                if (prevRecording) {
                  const prevEnd = prevRecording.startTime + (prevRecording.duration || 0)
                  if (displayTime - circleHalfTime < prevEnd) {
                    displayTime = prevEnd + circleHalfTime
                  }
                }
              }
              displayTime = Math.min(displayTime, totalDuration)

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center text-white",
                    isRecording ? "h-9 rounded-[9px]" : "rounded-full w-9 h-9",
                    draggedEvent === event.id ? "z-30 shadow-lg ring-2 ring-white/50" : "z-10",
                    getEventColor(event),
                  )}
                  style={
                    isRecording
                      ? {
                          left: getPositionFromTime(displayTime),
                          width: `${widthPercent}%`,
                          minWidth: "2.25rem",
                          transform: "translateY(-50%)",
                        }
                      : {
                          left: `calc(${getPositionFromTime(displayTime)} - 20px)`,
                          transform: "translateY(-50%)",
                        }
                  }
                  onMouseDown={(e) => handleMouseDown(event.id, e, event)}
                  onTouchStart={(e) => handleTouchStart(event.id, e, event)}
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
          className={cn("flex justify-between px-2 mt-2 font-black text-gray-600", isMobile ? "text-xs" : "text-sm")}
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
        <h4 className="font-black text-gray-600 text-base">Timeline Events</h4>
        <AnimatePresence>
          {events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 text-gray-500 "
            >
              <div className="mb-2 text-base">No events added yet</div>
              <div className="text-sm">Add instruction-cue pairs or recordings to build your meditation timeline :) </div>
            </motion.div>
          ) : (
            events
              .sort((a, b) => a.startTime - b.startTime)
              .map((event, index) => {
                const displayInfo = getEventDisplayInfo(event)
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={cn("p-4 bg-white shadow-md ", "border-[3px] border-muted")}>
                      <div className="flex items-center w-full mx-[-8px] px-1 pl-0">
                        <div className="flex items-center justify-center w-6 h-6 flex-shrink-0 mr-1.5">
                          <span className="text-gray-500 font-serif font-black text-sm">{index + 1}</span>
                        </div>

                        <div
                          className={cn(
                            "flex items-center justify-center text-white shadow-sm h-9 w-9 flex-shrink-0",
                            event.type === "recorded_voice" ? "rounded-[9px]" : "rounded-full",
                            getEventColor(event),
                          )}
                        >
                          {displayInfo.icon}
                        </div>

                        <div className="flex flex-col flex-grow min-w-0 ml-3">
                          <div className="flex items-center space-x-2 mb-1 flex-wrap">
                            <Badge variant="outline" className="text-xs text-gray-700 border-none">
                              {event.type === "instruction_sound" ? "Instruction + Sound" : "Voice Recording"}
                            </Badge>
                            {editingEventId === event.id ? (
                              <div className="flex items-center space-x-2">
                                <Input
                                  value={editingTime}
                                  onChange={(e) => setEditingTime(e.target.value)}
                                  placeholder="HH:MM:SS"
                                  className="w-20 h-6 text-xs"
                                />
                                {event.type === "recorded_voice" && (
                                  <>
                                    <span className="text-xs text-gray-500">-</span>
                                    <Input
                                      value={editingDuration}
                                      onChange={(e) => setEditingDuration(e.target.value)}
                                      placeholder="Duration"
                                      className="w-20 h-6 text-xs"
                                      pattern="[0-9]{1,2}:[0-9]{2}"
                                      disabled
                                      title="Duration is determined by the recording length"
                                    />
                                  </>
                                )}
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
                                className="text-gray-500 hover:text-gray-700 bg-gray-100 px-2 py-1 rounded font-serif text-xs ml-0 mr-2"
                              >
                                {event.type === "recorded_voice" && event.duration
                                  ? `${formatTime(event.startTime)} - ${formatTime(event.startTime + event.duration)} (${formatTime(event.duration)})`
                                  : formatTime(event.startTime)}
                              </button>
                            )}
                          </div>
                          <div className="text-sm text-gray-700 font-black">
                            <span className="font-black text-gray-600">{displayInfo.title}</span>
                          </div>
                          {event.type === "instruction_sound" && (
                            <p className="text-xs font-black text-gray-500">{displayInfo.subtitle}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-x-0.5 sm:gap-x-1.5 ml-auto">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => playEventAudio(event)}
                            className="hover:text-gray-600 px-1.5 py-1.5 h-7 w-7"
                            title={playingEventId === event.id ? "Pause audio" : "Preview audio"}
                          >
                            {playingEventId === event.id ? (
                              <Pause className="h-3.5 w-3.5" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDuplicateEvent(event)}
                            className="hover:text-gray-600 px-1.5 py-1.5 h-7 w-7"
                            title="Duplicate event"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onRemoveEvent(event.id)}
                            className="text-red-500 hover:text-red-700 px-1.5 py-1.5 h-7 w-7"
                            title="Remove event"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Play, Pause, RotateCcw, Trash2, Music2, Mic, MessageSquareText } from "lucide-react/dist/lucide-react.mjs" // Corrected import path
import { cn, formatTime } from "@/lib/utils"
import type { TimelineEvent } from "@/lib/types"
import type { HTMLDivElement } from "react"

interface VisualTimelineProps {
  events: TimelineEvent[]
  totalDuration: number // in seconds
  onUpdateEvent: (eventId: string, newTime: number) => void
  onRemoveEvent: (eventId: string) => void
}

export function VisualTimeline({ events, totalDuration, onUpdateEvent, onRemoveEvent }: VisualTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeEventId, setActiveEventId] = useState<string | null>(null)
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({})

  const startPlayback = useCallback(() => {
    if (events.length === 0) return

    setIsPlaying(true)
    playbackIntervalRef.current = setInterval(() => {
      setCurrentTime((prevTime) => {
        const newTime = prevTime + 0.1 // Increment by 100ms

        let foundActive = false
        for (const event of events) {
          if (newTime >= event.startTime && newTime < event.startTime + (event.duration || 0)) {
            if (activeEventId !== event.id) {
              setActiveEventId(event.id)
              // Play sound cue if it's an instruction_sound event
              if (event.type === "instruction_sound" && event.soundCueSrc) {
                const audio = audioRefs.current[event.id]
                if (audio) {
                  audio.currentTime = 0
                  audio.play().catch((e) => console.error("Error playing sound cue:", e))
                }
              }
            }
            foundActive = true
            break
          }
        }
        if (!foundActive) {
          setActiveEventId(null)
        }

        if (newTime >= totalDuration) {
          clearInterval(playbackIntervalRef.current!)
          setIsPlaying(false)
          setCurrentTime(0)
          setActiveEventId(null)
          return 0
        }
        return newTime
      })
    }, 100) // Update every 100ms
  }, [events, totalDuration, activeEventId])

  const pausePlayback = useCallback(() => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current)
      playbackIntervalRef.current = null
    }
    setIsPlaying(false)
    // Pause all playing audio cues
    Object.values(audioRefs.current).forEach((audio) => audio?.pause())
  }, [])

  const resetPlayback = useCallback(() => {
    pausePlayback()
    setCurrentTime(0)
    setActiveEventId(null)
  }, [pausePlayback])

  useEffect(() => {
    // Cleanup interval on component unmount
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current)
      }
      Object.values(audioRefs.current).forEach((audio) => {
        if (audio) {
          audio.pause()
          audio.src = ""
        }
      })
    }
  }, [])

  // Preload audio for sound cues and recorded voices
  useEffect(() => {
    events.forEach((event) => {
      let srcToLoad: string | undefined
      if (event.type === "instruction_sound" && event.soundCueSrc && !event.soundCueSrc.startsWith("musical:")) {
        srcToLoad = event.soundCueSrc
      } else if (event.type === "recorded_voice" && event.recordedAudioUrl) {
        srcToLoad = event.recordedAudioUrl
      }

      if (srcToLoad) {
        if (!audioRefs.current[event.id]) {
          audioRefs.current[event.id] = new Audio()
          audioRefs.current[event.id]!.preload = "auto"
          audioRefs.current[event.id]!.volume = 0.7
          audioRefs.current[event.id]!.onerror = (e) => console.warn(`Audio error for ${event.id}:`, e)
        }
        audioRefs.current[event.id]!.src = srcToLoad
      } else if (audioRefs.current[event.id]) {
        // Clean up if event no longer has a source or is removed
        audioRefs.current[event.id]!.pause()
        audioRefs.current[event.id]!.src = ""
        audioRefs.current[event.id] = null
      }
    })
  }, [events])

  const handleSliderChange = useCallback(
    (value: number[]) => {
      const newTime = value[0]
      setCurrentTime(newTime)
      // If playing, restart playback from new position
      if (isPlaying) {
        pausePlayback()
        setCurrentTime(newTime)
        // Find the event that should be active at the new time
        let accumulatedDuration = 0
        let newActiveId: string | null = null
        for (const event of events) {
          if (newTime >= accumulatedDuration && newTime < accumulatedDuration + (event.duration || 0)) {
            newActiveId = event.id
            break
          }
          accumulatedDuration += event.duration || 0
        }
        setActiveEventId(newActiveId)
        startPlayback()
      }
    },
    [isPlaying, events, pausePlayback, startPlayback],
  )

  const handleEventDrag = useCallback(
    (eventId: string, newX: number) => {
      if (!timelineRef.current) return

      const timelineWidth = timelineRef.current.offsetWidth
      const newTime = (newX / timelineWidth) * totalDuration
      onUpdateEvent(eventId, newTime)
    },
    [totalDuration, onUpdateEvent],
  )

  const getEventPosition = useCallback(
    (event: TimelineEvent) => {
      if (!timelineRef.current) return 0
      const timelineWidth = timelineRef.current.offsetWidth
      return (event.startTime / totalDuration) * timelineWidth
    },
    [totalDuration],
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="font-black dark:text-gray-200 text-gray-600 text-base">Timeline Events</h4>
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="ghost" onClick={isPlaying ? pausePlayback : startPlayback}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={resetPlayback}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative h-16 bg-gray-100 rounded-lg overflow-hidden dark:bg-gray-800 shadow-inner">
        <div ref={timelineRef} className="absolute inset-0 flex items-center" style={{ width: "100%", height: "100%" }}>
          {/* Current playback time indicator */}
          <div
            className="absolute h-full w-0.5 bg-logo-rose-500 z-20"
            style={{ left: `${(currentTime / totalDuration) * 100}%` }}
          />

          {/* Timeline events */}
          <AnimatePresence initial={false}>
            {events.map((event) => (
              <motion.div
                key={event.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={cn(
                  "absolute h-10 rounded-md flex items-center justify-center px-2 text-xs font-medium text-white shadow-md cursor-grab active:cursor-grabbing z-10",
                  event.type === "instruction_sound"
                    ? "bg-logo-teal-500 dark:bg-logo-teal-700"
                    : "bg-logo-rose-500 dark:bg-logo-rose-700",
                  activeEventId === event.id && "ring-2 ring-offset-2 ring-logo-amber-400 dark:ring-logo-amber-600",
                )}
                style={{
                  left: getEventPosition(event),
                  width: "auto", // Adjust width based on content or a minimum
                  minWidth: "40px",
                }}
                drag="x"
                dragConstraints={timelineRef}
                onDragEnd={(_, info) => {
                  handleEventDrag(event.id, info.point.x - (timelineRef.current?.getBoundingClientRect().left || 0))
                }}
                onTap={() => setActiveEventId(event.id)}
              >
                {event.type === "instruction_sound" ? (
                  <Music2 className="h-4 w-4 mr-1" />
                ) : (
                  <Mic className="h-4 w-4 mr-1" />
                )}
                <span className="truncate">
                  {event.type === "instruction_sound" ? event.soundCueName : event.recordedInstructionLabel}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-6 w-6 p-0 text-white/80 hover:text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation() // Prevent drag event from firing
                    onRemoveEvent(event.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <span className="text-sm font-black text-gray-600 dark:text-gray-300">{formatTime(currentTime)}</span>
        <Slider
          value={[currentTime]}
          max={totalDuration}
          step={0.1}
          onValueChange={handleSliderChange}
          className="flex-1"
          rangeClassName="bg-gradient-to-r from-logo-teal-500 to-logo-rose-500 dark:from-logo-teal-700 dark:to-logo-rose-700"
        />
        <span className="text-sm font-black text-gray-600 dark:text-gray-300">{formatTime(totalDuration)}</span>
      </div>

      {activeEventId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-4 bg-gray-50 rounded-lg shadow-inner dark:bg-gray-800"
        >
          <h5 className="font-black text-gray-700 dark:text-gray-200 mb-3">Selected Event Details</h5>
          {events
            .filter((event) => event.id === activeEventId)
            .map((event) => (
              <div key={event.id} className="space-y-3">
                <div className="flex items-center space-x-2 text-sm font-black text-gray-600 dark:text-gray-300">
                  {event.type === "instruction_sound" ? <Music2 className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  <span>
                    {event.type === "instruction_sound" ? event.soundCueName : event.recordedInstructionLabel}
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-start">
                  <MessageSquareText className="h-4 w-4 mr-2 flex-shrink-0" />
                  <p className="flex-grow">
                    {event.type === "instruction_sound" ? event.instructionText : "Recorded Voice"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`start-time-${event.id}`} className="text-xs text-gray-500 dark:text-gray-400">
                      Start Time (s)
                    </Label>
                    <Input
                      id={`start-time-${event.id}`}
                      type="number"
                      value={event.startTime.toFixed(1)}
                      onChange={(e) => onUpdateEvent(event.id, Number.parseFloat(e.target.value))}
                      step="0.1"
                      min="0"
                      max={totalDuration.toFixed(1)}
                      className="mt-1 text-sm font-black"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`duration-${event.id}`} className="text-xs text-gray-500 dark:text-gray-400">
                      Duration (s)
                    </Label>
                    <Input
                      id={`duration-${event.id}`}
                      type="number"
                      value={(event.duration || 0).toFixed(1)}
                      readOnly
                      className="mt-1 text-sm font-black bg-gray-100 dark:bg-gray-700"
                    />
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onRemoveEvent(event.id)}
                  className="w-full mt-4 font-black"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Event
                </Button>
              </div>
            ))}
        </motion.div>
      )}
    </div>
  )
}

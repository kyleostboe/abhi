"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Play, Pause, StopCircle, Plus, Volume2, VolumeX, Trash2, Edit, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import type {
  AmbientSound,
  Meditation,
  MeditationEvent,
  SoundCueEvent,
  AmbientSoundEvent,
  GuidedMeditationEvent,
} from "@/lib/types"
import { formatTime } from "@/lib/audio-utils"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface VisualTimelineProps {
  initialMeditation?: Meditation
  ambientSounds: AmbientSound[]
  onSaveMeditation?: (meditation: Meditation) => void
}

const EventCard: React.FC<{
  event: MeditationEvent
  onEdit: (event: MeditationEvent) => void
  onDelete: (id: string) => void
}> = ({ event, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: event.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const renderEventDetails = () => {
    switch (event.type) {
      case "sound_cue":
        return (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">Cue: {(event as SoundCueEvent).soundCueName}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Volume: {(event as SoundCueEvent).volume * 100}%</p>
          </>
        )
      case "ambient_sound":
        return (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sound: {(event as AmbientSoundEvent).ambientSoundName}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Volume: {(event as AmbientSoundEvent).volume * 100}%
            </p>
          </>
        )
      case "guided_meditation":
        return (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Script: {(event as GuidedMeditationEvent).script.substring(0, 50)}...
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Voice: {(event as GuidedMeditationEvent).voice}</p>
          </>
        )
      default:
        return null
    }
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="mb-4 bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700"
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" {...listeners} {...attributes}>
            <GripVertical className="h-5 w-5 text-gray-500" />
          </Button>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              {event.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">Duration: {formatTime(event.duration)}</p>
            {renderEventDetails()}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(event)}>
            <Edit className="h-5 w-5 text-blue-500" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(event.id)}>
            <Trash2 className="h-5 w-5 text-red-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function VisualTimeline({ initialMeditation, ambientSounds, onSaveMeditation }: VisualTimelineProps) {
  const [meditation, setMeditation] = useState<Meditation>(
    initialMeditation || { id: "new-meditation", title: "New Meditation", timeline: [] },
  )
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.5)
  const [isMuted, setIsMuted] = useState(false)
  const [editEvent, setEditEvent] = useState<MeditationEvent | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newEventType, setNewEventType] = useState<MeditationEvent["type"]>("sound_cue")

  const audioRefs = useRef<HTMLAudioElement[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentEventIndexRef = useRef(0)
  const currentEventStartTimeRef = useRef(0)

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  const totalDuration = meditation.timeline.reduce((sum, event) => sum + event.duration, 0)

  const playEvent = useCallback(
    (event: MeditationEvent) => {
      if (event.type === "sound_cue" || event.type === "ambient_sound") {
        const audio = new Audio((event as SoundCueEvent | AmbientSoundEvent).soundCueSrc)
        audio.volume = isMuted ? 0 : volume * (event.volume || 1)
        audio.play().catch((e) => console.error("Audio play failed:", e))
        audioRefs.current.push(audio)
      } else if (event.type === "guided_meditation") {
        // Implement text-to-speech for guided meditations
        const utterance = new SpeechSynthesisUtterance((event as GuidedMeditationEvent).script)
        utterance.volume = isMuted ? 0 : volume
        speechSynthesis.speak(utterance)
      }
    },
    [volume, isMuted],
  )

  const startTimeline = useCallback(() => {
    if (isPlaying) return

    setIsPlaying(true)
    currentEventIndexRef.current = 0
    currentEventStartTimeRef.current = currentTime

    intervalRef.current = setInterval(() => {
      setCurrentTime((prevTime) => {
        const newTime = prevTime + 1000 // Update every second

        // Check if current event is finished
        const elapsedInCurrentEvent = newTime - currentEventStartTimeRef.current
        let currentEvent = meditation.timeline[currentEventIndexRef.current]

        while (currentEvent && elapsedInCurrentEvent >= currentEvent.duration) {
          // Move to next event
          currentEventIndexRef.current++
          currentEventStartTimeRef.current = newTime // Reset start time for next event
          currentEvent = meditation.timeline[currentEventIndexRef.current]

          if (currentEvent) {
            playEvent(currentEvent)
          }
        }

        if (newTime >= totalDuration) {
          clearInterval(intervalRef.current!)
          setIsPlaying(false)
          setCurrentTime(0)
          currentEventIndexRef.current = 0
          currentEventStartTimeRef.current = 0
          audioRefs.current.forEach((audio) => audio.pause())
          audioRefs.current = []
          speechSynthesis.cancel()
          return totalDuration // Cap at total duration
        }
        return newTime
      })
    }, 1000) // Update every second
  }, [isPlaying, meditation.timeline, totalDuration, currentTime, playEvent])

  const pauseTimeline = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsPlaying(false)
    audioRefs.current.forEach((audio) => audio.pause())
    speechSynthesis.cancel()
  }, [])

  const resetTimeline = useCallback(() => {
    pauseTimeline()
    setCurrentTime(0)
    currentEventIndexRef.current = 0
    currentEventStartTimeRef.current = 0
    audioRefs.current.forEach((audio) => audio.pause())
    audioRefs.current = []
    speechSynthesis.cancel()
  }, [pauseTimeline])

  useEffect(() => {
    // Clean up on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      audioRefs.current.forEach((audio) => audio.pause())
      speechSynthesis.cancel()
    }
  }, [])

  useEffect(() => {
    audioRefs.current.forEach((audio) => {
      audio.volume = isMuted
        ? 0
        : volume * (audio.dataset.originalVolume ? Number.parseFloat(audio.dataset.originalVolume) : 1)
    })
    if (speechSynthesis.speaking) {
      // This is a bit tricky as SpeechSynthesisUtterance volume is set once.
      // For ongoing speech, you might need to stop and restart with new volume.
      // For simplicity, we'll just mute/unmute.
      if (isMuted) {
        speechSynthesis.pause()
      } else {
        speechSynthesis.resume()
      }
    }
  }, [volume, isMuted])

  const handleAddEvent = () => {
    let newEvent: MeditationEvent
    const baseEvent = {
      id: `event-${Date.now()}`,
      duration: 30000, // Default 30 seconds
      startOffset: 0, // Default start offset
    }

    switch (newEventType) {
      case "sound_cue":
        newEvent = {
          ...baseEvent,
          type: "sound_cue",
          soundCueName: "Bell", // Default
          soundCueSrc: "/sounds/bell.mp3", // Default
          volume: 0.8,
        } as SoundCueEvent
        break
      case "ambient_sound":
        newEvent = {
          ...baseEvent,
          type: "ambient_sound",
          ambientSoundName: ambientSounds[0]?.name || "Forest Rain", // Default to first available
          ambientSoundSrc: ambientSounds[0]?.file_url || "/sounds/forest-rain.mp3", // Default
          volume: 0.5,
        } as AmbientSoundEvent
        break
      case "guided_meditation":
        newEvent = {
          ...baseEvent,
          type: "guided_meditation",
          script: "Take a deep breath...",
          voice: "standard",
        } as GuidedMeditationEvent
        break
      default:
        return
    }
    setMeditation((prev) => ({
      ...prev,
      timeline: [...prev.timeline, newEvent],
    }))
    setIsDialogOpen(false)
  }

  const handleEditEvent = (event: MeditationEvent) => {
    setEditEvent({ ...event }) // Create a copy to edit
    setIsDialogOpen(true)
  }

  const handleSaveEditedEvent = () => {
    if (editEvent) {
      setMeditation((prev) => ({
        ...prev,
        timeline: prev.timeline.map((e) => (e.id === editEvent.id ? editEvent : e)),
      }))
      setEditEvent(null)
      setIsDialogOpen(false)
    }
  }

  const handleDeleteEvent = (id: string) => {
    setMeditation((prev) => ({
      ...prev,
      timeline: prev.timeline.filter((event) => event.id !== id),
    }))
    toast({
      title: "Event Deleted",
      description: "The event has been removed from the timeline.",
    })
  }

  const handleSaveMeditation = async () => {
    if (onSaveMeditation) {
      onSaveMeditation(meditation)
    }
    toast({
      title: "Meditation Saved",
      description: "Your meditation timeline has been saved.",
    })
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setMeditation((prev) => {
        const oldIndex = prev.timeline.findIndex((e) => e.id === active.id)
        const newIndex = prev.timeline.findIndex((e) => e.id === over?.id)
        const newTimeline = Array.from(prev.timeline)
        const [movedItem] = newTimeline.splice(oldIndex, 1)
        newTimeline.splice(newIndex, 0, movedItem)
        return { ...prev, timeline: newTimeline }
      })
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">{meditation.title}</CardTitle>
        <div className="flex items-center gap-2">
          <Button onClick={handleSaveMeditation} variant="outline">
            Save Meditation
          </Button>
          <Button
            onClick={() => {
              setEditEvent(null)
              setIsDialogOpen(true)
              setNewEventType("sound_cue")
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Event
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-mono text-gray-800 dark:text-gray-200">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={isPlaying ? pauseTimeline : startTimeline} size="icon" variant="ghost">
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
            <Button onClick={resetTimeline} size="icon" variant="ghost">
              <StopCircle className="h-6 w-6" />
            </Button>
            <Button onClick={() => setIsMuted(!isMuted)} size="icon" variant="ghost">
              {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
            </Button>
            <Slider
              value={[volume * 100]}
              onValueChange={([val]) => setVolume(val / 100)}
              max={100}
              step={1}
              className="w-24"
              aria-label="Volume"
            />
          </div>
        </div>

        <div className="space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={meditation.timeline.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              {meditation.timeline.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No events added yet. Click "Add Event" to start building your timeline.
                </p>
              ) : (
                meditation.timeline.map((event) => (
                  <EventCard key={event.id} event={event} onEdit={handleEditEvent} onDelete={handleDeleteEvent} />
                ))
              )}
            </SortableContext>
          </DndContext>
        </div>

        {/* Add/Edit Event Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editEvent ? "Edit Event" : "Add New Event"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {!editEvent && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="eventType" className="text-right">
                    Type
                  </Label>
                  <Select
                    value={newEventType}
                    onValueChange={(value: MeditationEvent["type"]) => setNewEventType(value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sound_cue">Sound Cue</SelectItem>
                      <SelectItem value="ambient_sound">Ambient Sound</SelectItem>
                      <SelectItem value="guided_meditation">Guided Meditation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="duration" className="text-right">
                  Duration (ms)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  value={editEvent?.duration || 0}
                  onChange={(e) =>
                    setEditEvent((prev) => (prev ? { ...prev, duration: Number.parseInt(e.target.value) } : null))
                  }
                  className="col-span-3"
                />
              </div>

              {(editEvent?.type === "sound_cue" || newEventType === "sound_cue") && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="soundCueName" className="text-right">
                      Cue Name
                    </Label>
                    <Input
                      id="soundCueName"
                      value={(editEvent as SoundCueEvent)?.soundCueName || ""}
                      onChange={(e) =>
                        setEditEvent((prev) =>
                          prev ? ({ ...prev, soundCueName: e.target.value } as SoundCueEvent) : null,
                        )
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="soundCueSrc" className="text-right">
                      Cue Source
                    </Label>
                    <Input
                      id="soundCueSrc"
                      value={(editEvent as SoundCueEvent)?.soundCueSrc || ""}
                      onChange={(e) =>
                        setEditEvent((prev) =>
                          prev ? ({ ...prev, soundCueSrc: e.target.value } as SoundCueEvent) : null,
                        )
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="volume" className="text-right">
                      Volume (0-1)
                    </Label>
                    <Input
                      id="volume"
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={(editEvent as SoundCueEvent)?.volume || 0}
                      onChange={(e) =>
                        setEditEvent((prev) =>
                          prev ? ({ ...prev, volume: Number.parseFloat(e.target.value) } as SoundCueEvent) : null,
                        )
                      }
                      className="col-span-3"
                    />
                  </div>
                </>
              )}

              {(editEvent?.type === "ambient_sound" || newEventType === "ambient_sound") && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ambientSound" className="text-right">
                      Ambient Sound
                    </Label>
                    <Select
                      value={(editEvent as AmbientSoundEvent)?.ambientSoundName || ""}
                      onValueChange={(name) => {
                        const selectedSound = ambientSounds.find((s) => s.name === name)
                        setEditEvent((prev) =>
                          prev
                            ? ({
                                ...prev,
                                ambientSoundName: name,
                                ambientSoundSrc: selectedSound?.file_url || "",
                              } as AmbientSoundEvent)
                            : null,
                        )
                      }}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select an ambient sound" />
                      </SelectTrigger>
                      <SelectContent>
                        {ambientSounds.map((sound) => (
                          <SelectItem key={sound.id} value={sound.name}>
                            {sound.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="volume" className="text-right">
                      Volume (0-1)
                    </Label>
                    <Input
                      id="volume"
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={(editEvent as AmbientSoundEvent)?.volume || 0}
                      onChange={(e) =>
                        setEditEvent((prev) =>
                          prev ? ({ ...prev, volume: Number.parseFloat(e.target.value) } as AmbientSoundEvent) : null,
                        )
                      }
                      className="col-span-3"
                    />
                  </div>
                </>
              )}

              {(editEvent?.type === "guided_meditation" || newEventType === "guided_meditation") && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="script" className="text-right">
                      Script
                    </Label>
                    <Textarea
                      id="script"
                      value={(editEvent as GuidedMeditationEvent)?.script || ""}
                      onChange={(e) =>
                        setEditEvent((prev) =>
                          prev ? ({ ...prev, script: e.target.value } as GuidedMeditationEvent) : null,
                        )
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="voice" className="text-right">
                      Voice
                    </Label>
                    <Select
                      value={(editEvent as GuidedMeditationEvent)?.voice || "standard"}
                      onValueChange={(voice) =>
                        setEditEvent((prev) => (prev ? ({ ...prev, voice: voice } as GuidedMeditationEvent) : null))
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="calm">Calm</SelectItem>
                        <SelectItem value="deep">Deep</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button onClick={editEvent ? handleSaveEditedEvent : handleAddEvent}>
                {editEvent ? "Save Changes" : "Add Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

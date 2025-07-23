"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { INSTRUCTIONS_LIBRARY, SOUND_CUES_LIBRARY, AMBIENT_SOUNDS_LIBRARY } from "@/app/labs/lib/meditation-data"
import { generateSyntheticSound, generateAmbientSound } from "@/app/labs/lib/meditation-data"
import { Play, Pause, StopCircle, Volume2, VolumeX, Plus, Trash2, Edit, Save, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TimelineEvent, AmbientSound } from "@/lib/types"
import { v4 as uuidv4 } from "uuid"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

// Helper to format time for display
const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

// SortableItem component for timeline events
interface SortableItemProps {
  event: TimelineEvent
  onEdit: (event: TimelineEvent) => void
  onDelete: (id: string) => void
  isEditing: boolean
  editingEvent: TimelineEvent | null
  onSaveEdit: (event: TimelineEvent) => void
  onCancelEdit: () => void
  onEditChange: (field: keyof TimelineEvent, value: any) => void
}

const SortableItem: React.FC<SortableItemProps> = ({
  event,
  onEdit,
  onDelete,
  isEditing,
  editingEvent,
  onSaveEdit,
  onCancelEdit,
  onEditChange,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: event.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const currentEvent = isEditing && editingEvent?.id === event.id ? editingEvent : event

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center justify-between p-3 border rounded-md bg-white dark:bg-gray-800 shadow-sm mb-2"
    >
      {isEditing && editingEvent?.id === event.id ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
          <Input
            type="number"
            value={currentEvent.time / 1000} // Display in seconds
            onChange={(e) => onEditChange("time", Number.parseFloat(e.target.value) * 1000)}
            placeholder="Time (s)"
            className="col-span-1"
          />
          {currentEvent.type === "instruction" && (
            <Select
              value={currentEvent.instructionId || ""}
              onValueChange={(value) => onEditChange("instructionId", value)}
            >
              <SelectTrigger className="col-span-1">
                <SelectValue placeholder="Select Instruction" />
              </SelectTrigger>
              <SelectContent>
                {INSTRUCTIONS_LIBRARY.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    {inst.text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {currentEvent.type === "sound" && (
            <>
              <Select
                value={currentEvent.soundCueId || ""}
                onValueChange={(value) => onEditChange("soundCueId", value)}
              >
                <SelectTrigger className="col-span-1">
                  <SelectValue placeholder="Select Sound Cue" />
                </SelectTrigger>
                <SelectContent>
                  {SOUND_CUES_LIBRARY.map((sound) => (
                    <SelectItem key={sound.id} value={sound.id}>
                      {sound.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="text"
                value={currentEvent.soundCueName || ""}
                onChange={(e) => onEditChange("soundCueName", e.target.value)}
                placeholder="Sound Name"
                className="col-span-1"
              />
              <Input
                type="text"
                value={currentEvent.soundCueSrc || ""}
                onChange={(e) => onEditChange("soundCueSrc", e.target.value)}
                placeholder="Sound Source"
                className="col-span-1"
              />
            </>
          )}
          {currentEvent.type === "ambient" && (
            <>
              <Select
                value={currentEvent.ambientSoundId || ""}
                onValueChange={(value) => onEditChange("ambientSoundId", value)}
              >
                <SelectTrigger className="col-span-1">
                  <SelectValue placeholder="Select Ambient Sound" />
                </SelectTrigger>
                <SelectContent>
                  {AMBIENT_SOUNDS_LIBRARY.map((ambient) => (
                    <SelectItem key={ambient.id} value={ambient.id}>
                      {ambient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="text"
                value={currentEvent.soundCueName || ""}
                onChange={(e) => onEditChange("soundCueName", e.target.value)}
                placeholder="Ambient Name"
                className="col-span-1"
              />
              <Input
                type="text"
                value={currentEvent.soundCueSrc || ""}
                onChange={(e) => onEditChange("soundCueSrc", e.target.value)}
                placeholder="Ambient Source"
                className="col-span-1"
              />
              <Input
                type="number"
                value={currentEvent.volume ?? 0.5}
                onChange={(e) => onEditChange("volume", Number.parseFloat(e.target.value))}
                placeholder="Volume"
                min="0"
                max="1"
                step="0.01"
                className="col-span-1"
              />
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2" {...listeners}>
          <span className="font-mono text-sm text-gray-600 dark:text-gray-400 w-20 flex-shrink-0">
            {formatTime(event.time)}
          </span>
          <span
            className={cn(
              "font-medium",
              event.type === "instruction" && "text-blue-600 dark:text-blue-400",
              event.type === "sound" && "text-green-600 dark:text-green-400",
              event.type === "ambient" && "text-purple-600 dark:text-purple-400",
            )}
          >
            {event.type === "instruction" &&
              (INSTRUCTIONS_LIBRARY.find((i) => i.id === event.instructionId)?.text || "Unknown Instruction")}
            {event.type === "sound" &&
              (event.soundCueName ||
                SOUND_CUES_LIBRARY.find((s) => s.id === event.soundCueId)?.name ||
                "Unknown Sound")}
            {event.type === "ambient" &&
              (event.soundCueName ||
                AMBIENT_SOUNDS_LIBRARY.find((a) => a.id === event.ambientSoundId)?.name ||
                "Unknown Ambient")}
          </span>
          {event.type === "ambient" && event.volume !== undefined && (
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto sm:ml-2">
              Vol: {(event.volume * 100).toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div className="flex space-x-2 ml-4 flex-shrink-0">
        {isEditing && editingEvent?.id === event.id ? (
          <>
            <Button variant="ghost" size="icon" onClick={() => onSaveEdit(currentEvent)}>
              <Save className="h-5 w-5 text-green-500" />
              <span className="sr-only">Save</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onCancelEdit}>
              <X className="h-5 w-5 text-red-500" />
              <span className="sr-only">Cancel</span>
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => onEdit(event)}>
            <Edit className="h-5 w-5 text-gray-500" />
            <span className="sr-only">Edit</span>
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => onDelete(event.id)}>
          <Trash2 className="h-5 w-5 text-red-500" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </div>
  )
}

export default function EncoderPage() {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [nextEventIndex, setNextEventIndex] = useState(0)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [mainGainNode, setMainGainNode] = useState<GainNode | null>(null)
  const [masterVolume, setMasterVolume] = useState(0.5) // Master volume for all playback
  const [isMuted, setIsMuted] = useState(false)
  const [activeAmbientSources, setActiveAmbientSources] = useState<Map<string, AudioBufferSourceNode>>(new Map())
  const [activeAmbientGainNodes, setActiveAmbientGainNodes] = useState<Map<string, GainNode>>(new Map())

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})
  const ambientAudioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})

  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Initialize AudioContext and GainNode
  useEffect(() => {
    if (typeof window !== "undefined") {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      const ac = new AudioContext()
      setAudioContext(ac)

      const mg = ac.createGain()
      mg.connect(ac.destination)
      setMainGainNode(mg)

      // Set initial master volume
      mg.gain.setValueAtTime(masterVolume, ac.currentTime)
    }
  }, [])

  // Update master volume
  useEffect(() => {
    if (mainGainNode && audioContext) {
      mainGainNode.gain.setValueAtTime(isMuted ? 0 : masterVolume, audioContext.currentTime)
    }
  }, [masterVolume, isMuted, mainGainNode, audioContext])

  // Playback logic
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => prev + 100) // Update every 100ms
      }, 100)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying])

  useEffect(() => {
    // Sort timeline events by time
    const sortedTimeline = [...timeline].sort((a, b) => a.time - b.time)
    setTimeline(sortedTimeline)

    if (!isPlaying) return

    // Process events that are due
    for (let i = nextEventIndex; i < sortedTimeline.length; i++) {
      const event = sortedTimeline[i]
      if (currentTime >= event.time) {
        handleEvent(event)
        setNextEventIndex(i + 1)
      } else {
        break // Events are sorted, so no need to check further
      }
    }
  }, [currentTime, isPlaying, timeline, nextEventIndex])

  const handleEvent = useCallback(
    async (event: TimelineEvent) => {
      if (!audioContext || !mainGainNode) return

      if (event.type === "instruction") {
        const instruction = INSTRUCTIONS_LIBRARY.find((inst) => inst.id === event.instructionId)
        if (instruction) {
          console.log(`Instruction at ${formatTime(event.time)}: ${instruction.text}`)
          // In a real app, you'd play text-to-speech here
        }
      } else if (event.type === "sound") {
        const soundCue =
          SOUND_CUES_LIBRARY.find((s) => s.id === event.soundCueId) ||
          (event.soundCueName && event.soundCueSrc
            ? { id: uuidv4(), name: event.soundCueName, src: event.soundCueSrc }
            : undefined)

        if (soundCue) {
          console.log(`Sound at ${formatTime(event.time)}: ${soundCue.name}`)
          if (soundCue.src.startsWith("synthetic:")) {
            try {
              // Create a new AudioContext for each synthetic sound to ensure it plays independently
              // and can be closed after playback.
              const tempAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
              const tempGainNode = tempAudioContext.createGain()
              tempGainNode.connect(tempAudioContext.destination)
              tempGainNode.gain.setValueAtTime(mainGainNode.gain.value, tempAudioContext.currentTime) // Match master volume

              await generateSyntheticSound(soundCue, tempAudioContext)
            } catch (error) {
              console.error("Failed to play synthetic sound:", error)
            }
          } else {
            // Play pre-recorded sound file
            let audio = audioRefs.current[soundCue.id]
            if (!audio) {
              audio = new Audio(soundCue.src)
              audio.preload = "auto"
              audioRefs.current[soundCue.id] = audio
            }
            audio.volume = mainGainNode.gain.value // Apply master volume
            audio.currentTime = 0
            audio.play().catch((e) => console.error("Error playing audio:", e))
          }
        }
      } else if (event.type === "ambient") {
        const ambientSound =
          AMBIENT_SOUNDS_LIBRARY.find((a) => a.id === event.ambientSoundId) ||
          (event.soundCueName && event.soundCueSrc
            ? { id: uuidv4(), name: event.soundCueName, src: event.soundCueSrc }
            : undefined)

        if (ambientSound) {
          console.log(`Ambient at ${formatTime(event.time)}: ${ambientSound.name}`)

          // Stop any currently playing instance of this ambient sound
          if (activeAmbientSources.has(ambientSound.id)) {
            activeAmbientSources.get(ambientSound.id)?.stop()
            activeAmbientSources.delete(ambientSound.id)
            activeAmbientGainNodes.delete(ambientSound.id)
          }

          if (ambientSound.src.startsWith("synthetic:")) {
            try {
              // Create a new AudioContext for each synthetic ambient sound
              const tempAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
              const tempGainNode = tempAudioContext.createGain()
              tempGainNode.connect(tempAudioContext.destination)
              tempGainNode.gain.setValueAtTime(
                (event.volume ?? ambientSound.volume ?? 0.5) * mainGainNode.gain.value,
                tempAudioContext.currentTime,
              )

              // Generate and play the synthetic ambient sound
              await generateAmbientSound(ambientSound, tempAudioContext, 3600) // Play for a long duration (1 hour)
              // Store the source and gain node if needed for stopping/volume control
              // For now, we're letting it play and relying on new events to stop old ones.
            } catch (error) {
              console.error("Failed to play synthetic ambient sound:", error)
            }
          } else {
            // Play pre-recorded ambient sound file
            let audio = ambientAudioRefs.current[ambientSound.id]
            if (!audio) {
              audio = new Audio(ambientSound.src)
              audio.loop = true
              audio.preload = "auto"
              ambientAudioRefs.current[ambientSound.id] = audio
            }
            audio.volume = (event.volume ?? ambientSound.volume ?? 0.5) * mainGainNode.gain.value // Apply individual and master volume
            audio.currentTime = 0
            audio.play().catch((e) => console.error("Error playing ambient audio:", e))
          }
        }
      }
    },
    [audioContext, mainGainNode, activeAmbientSources, activeAmbientGainNodes],
  )

  const startPlayback = () => {
    if (!audioContext) {
      console.error("AudioContext not initialized.")
      return
    }
    if (audioContext.state === "suspended") {
      audioContext.resume().then(() => {
        setIsPlaying(true)
        console.log("AudioContext resumed and playback started.")
      })
    } else {
      setIsPlaying(true)
      console.log("Playback started.")
    }
  }

  const pausePlayback = () => {
    setIsPlaying(false)
    console.log("Playback paused.")
  }

  const stopPlayback = () => {
    setIsPlaying(false)
    setCurrentTime(0)
    setNextEventIndex(0)
    console.log("Playback stopped and reset.")

    // Stop all playing audio elements
    Object.values(audioRefs.current).forEach((audio) => {
      audio.pause()
      audio.currentTime = 0
    })
    Object.values(ambientAudioRefs.current).forEach((audio) => {
      audio.pause()
      audio.currentTime = 0
    })
    activeAmbientSources.forEach((source) => source.stop())
    setActiveAmbientSources(new Map())
    setActiveAmbientGainNodes(new Map())
  }

  const addInstructionEvent = () => {
    setTimeline([
      ...timeline,
      {
        id: uuidv4(),
        type: "instruction",
        time: currentTime,
        instructionId: INSTRUCTIONS_LIBRARY[0]?.id || "",
      },
    ])
  }

  const addSoundCueEvent = () => {
    setTimeline([
      ...timeline,
      {
        id: uuidv4(),
        type: "sound",
        time: currentTime,
        soundCueId: SOUND_CUES_LIBRARY[0]?.id || "",
        soundCueName: SOUND_CUES_LIBRARY[0]?.name || "",
        soundCueSrc: SOUND_CUES_LIBRARY[0]?.src || "",
      },
    ])
  }

  const addAmbientSoundEvent = () => {
    setTimeline([
      ...timeline,
      {
        id: uuidv4(),
        type: "ambient",
        time: currentTime,
        ambientSoundId: AMBIENT_SOUNDS_LIBRARY[0]?.id || "",
        soundCueName: AMBIENT_SOUNDS_LIBRARY[0]?.name || "",
        soundCueSrc: AMBIENT_SOUNDS_LIBRARY[0]?.src || "",
        volume: AMBIENT_SOUNDS_LIBRARY[0]?.volume ?? 0.5,
      },
    ])
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setTimeline((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        const newItems = [...items]
        const [movedItem] = newItems.splice(oldIndex, 1)
        newItems.splice(newIndex, 0, movedItem)
        return newItems.sort((a, b) => a.time - b.time) // Re-sort by time after drag
      })
    }
  }

  const handleEdit = (event: TimelineEvent) => {
    setEditingEventId(event.id)
    setEditingEvent({ ...event }) // Create a mutable copy
  }

  const handleEditChange = (field: keyof TimelineEvent, value: any) => {
    if (editingEvent) {
      setEditingEvent((prev) => {
        if (!prev) return null
        const updatedEvent = { ...prev, [field]: value }

        // If instructionId changes, update instruction text
        if (field === "instructionId" && updatedEvent.type === "instruction") {
          const instruction = INSTRUCTIONS_LIBRARY.find((i) => i.id === value)
          // No direct text field on TimelineEvent for instruction, but useful for display
        }
        // If soundCueId changes, update soundCueName and soundCueSrc
        if (field === "soundCueId" && updatedEvent.type === "sound") {
          const sound = SOUND_CUES_LIBRARY.find((s) => s.id === value)
          if (sound) {
            updatedEvent.soundCueName = sound.name
            updatedEvent.soundCueSrc = sound.src
          }
        }
        // If ambientSoundId changes, update soundCueName, soundCueSrc, and volume
        if (field === "ambientSoundId" && updatedEvent.type === "ambient") {
          const ambient = AMBIENT_SOUNDS_LIBRARY.find((a) => a.id === value)
          if (ambient) {
            updatedEvent.soundCueName = ambient.name
            updatedEvent.soundCueSrc = ambient.src
            updatedEvent.volume = ambient.volume ?? 0.5
          }
        }

        return updatedEvent
      })
    }
  }

  const handleSaveEdit = (updatedEvent: TimelineEvent) => {
    setTimeline((prev) =>
      prev.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)).sort((a, b) => a.time - b.time),
    )
    setEditingEventId(null)
    setEditingEvent(null)
  }

  const handleCancelEdit = () => {
    setEditingEventId(null)
    setEditingEvent(null)
  }

  const handleDelete = (id: string) => {
    setTimeline((prev) => prev.filter((event) => event.id !== id))
    if (editingEventId === id) {
      setEditingEventId(null)
      setEditingEvent(null)
    }
  }

  const handleSaveTimeline = () => {
    const json = JSON.stringify(timeline, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "meditation_timeline.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    console.log("Timeline saved.")
  }

  const handleLoadTimeline = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const loadedTimeline: TimelineEvent[] = JSON.parse(e.target?.result as string)
          // Basic validation to ensure loaded data matches TimelineEvent structure
          if (
            Array.isArray(loadedTimeline) &&
            loadedTimeline.every(
              (item) =>
                typeof item.id === "string" &&
                typeof item.time === "number" &&
                ["instruction", "sound", "ambient"].includes(item.type),
            )
          ) {
            setTimeline(loadedTimeline.sort((a, b) => a.time - b.time))
            console.log("Timeline loaded successfully.")
            stopPlayback() // Reset playback state
          } else {
            console.error("Invalid timeline file format.")
            alert("Invalid timeline file format. Please select a valid JSON file.")
          }
        } catch (error) {
          console.error("Error parsing timeline file:", error)
          alert("Error parsing timeline file. Please ensure it's a valid JSON.")
        }
      }
      reader.readAsText(file)
    }
  }

  const toggleMute = () => {
    setIsMuted((prev) => !prev)
  }

  const handleAmbientSoundPreview = useCallback(
    async (ambient: AmbientSound, volume: number) => {
      if (!audioContext || !mainGainNode) return

      // Stop all active ambient sounds before playing a new preview
      activeAmbientSources.forEach((source) => source.stop())
      setActiveAmbientSources(new Map())
      activeAmbientGainNodes.forEach((gain) => gain.disconnect())
      setActiveAmbientGainNodes(new Map())

      if (ambient.src.startsWith("synthetic:")) {
        try {
          const source = audioContext.createBufferSource()
          const gainNode = audioContext.createGain()

          // Connect to mainGainNode to respect master volume
          gainNode.connect(mainGainNode)
          source.connect(gainNode)

          gainNode.gain.setValueAtTime(volume, audioContext.currentTime)

          // Generate the sound into a buffer
          const offlineContext = new OfflineAudioContext(
            1,
            audioContext.sampleRate * 5, // Generate 5 seconds of sound for preview
            audioContext.sampleRate,
          )
          await generateAmbientSound(ambient, offlineContext, 5, volume) // Pass volume to generator

          const renderedBuffer = await offlineContext.startRendering()
          source.buffer = renderedBuffer
          source.loop = true // Loop for preview
          source.start(0)

          setActiveAmbientSources((prev) => new Map(prev).set(ambient.id, source))
          setActiveAmbientGainNodes((prev) => new Map(prev).set(ambient.id, gainNode))
        } catch (error) {
          console.error("Failed to preview synthetic ambient sound:", error)
        }
      } else {
        let audio = ambientAudioRefs.current[ambient.id]
        if (!audio) {
          audio = new Audio(ambient.src)
          audio.loop = true
          audio.preload = "auto"
          ambientAudioRefs.current[ambient.id] = audio
        }
        audio.volume = volume * mainGainNode.gain.value // Apply individual and master volume
        audio.currentTime = 0
        audio.play().catch((e) => console.error("Error playing ambient audio:", e))
      }
    },
    [audioContext, mainGainNode, activeAmbientSources, activeAmbientGainNodes],
  )

  const stopAmbientSoundPreview = useCallback(
    (ambientId: string) => {
      if (activeAmbientSources.has(ambientId)) {
        activeAmbientSources.get(ambientId)?.stop()
        activeAmbientSources.delete(ambientId)
        activeAmbientGainNodes.get(ambientId)?.disconnect()
        activeAmbientGainNodes.delete(ambientId)
      } else if (ambientAudioRefs.current[ambientId]) {
        ambientAudioRefs.current[ambientId].pause()
        ambientAudioRefs.current[ambientId].currentTime = 0
      }
    },
    [activeAmbientSources, activeAmbientGainNodes],
  )

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-950 p-4 gap-4">
      {/* Left Panel: Controls and Timeline */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Playback Controls */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-50">Playback Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-4xl font-mono text-gray-800 dark:text-gray-200">{formatTime(currentTime)}</span>
              <div className="flex space-x-2">
                <Button onClick={startPlayback} disabled={isPlaying}>
                  <Play className="h-5 w-5 mr-2" /> Start
                </Button>
                <Button onClick={pausePlayback} disabled={!isPlaying}>
                  <Pause className="h-5 w-5 mr-2" /> Pause
                </Button>
                <Button onClick={stopPlayback} disabled={currentTime === 0 && !isPlaying}>
                  <StopCircle className="h-5 w-5 mr-2" /> Stop
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isMuted ? <VolumeX className="h-5 w-5 text-gray-500" /> : <Volume2 className="h-5 w-5 text-gray-500" />}
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={[masterVolume]}
                onValueChange={([value]) => setMasterVolume(value)}
                className="flex-1"
                aria-label="Master Volume"
              />
              <Button variant="ghost" size="icon" onClick={toggleMute}>
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                <span className="sr-only">{isMuted ? "Unmute" : "Mute"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Add Event Buttons */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-50">Add Events</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={addInstructionEvent}>
              <Plus className="h-5 w-5 mr-2" /> Add Instruction
            </Button>
            <Button onClick={addSoundCueEvent}>
              <Plus className="h-5 w-5 mr-2" /> Add Sound Cue
            </Button>
            <Button onClick={addAmbientSoundEvent}>
              <Plus className="h-5 w-5 mr-2" /> Add Ambient Sound
            </Button>
          </CardContent>
        </Card>

        {/* Timeline Display */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg flex-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-50">Timeline</CardTitle>
            <div className="flex space-x-2">
              <Button onClick={handleSaveTimeline} variant="outline">
                Save
              </Button>
              <Label htmlFor="load-timeline" className="cursor-pointer">
                <Input id="load-timeline" type="file" accept=".json" onChange={handleLoadTimeline} className="hidden" />
                <Button asChild variant="outline">
                  <span>Load</span>
                </Button>
              </Label>
            </div>
          </CardHeader>
          <CardContent className="h-[400px] overflow-y-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={timeline.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                {timeline.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No events yet. Add some to get started!
                  </p>
                ) : (
                  timeline.map((event) => (
                    <SortableItem
                      key={event.id}
                      event={event}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      isEditing={editingEventId === event.id}
                      editingEvent={editingEvent}
                      onSaveEdit={handleSaveEdit}
                      onCancelEdit={handleCancelEdit}
                      onEditChange={handleEditChange}
                    />
                  ))
                )}
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel: Libraries */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Instruction Library */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-50">Instruction Library</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] overflow-y-auto">
            <ul className="space-y-2">
              {INSTRUCTIONS_LIBRARY.map((instruction) => (
                <li key={instruction.id} className="p-2 border rounded-md bg-gray-50 dark:bg-gray-700">
                  <span className="font-medium text-blue-600 dark:text-blue-400">{instruction.category}:</span>{" "}
                  {instruction.text}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Sound Cue Library */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-50">Sound Cue Library</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] overflow-y-auto">
            <ul className="space-y-2">
              {SOUND_CUES_LIBRARY.map((sound) => (
                <li key={sound.id} className="p-2 border rounded-md bg-gray-50 dark:bg-gray-700">
                  <span className="font-medium text-green-600 dark:text-green-400">{sound.name}</span> (
                  {sound.src.startsWith("synthetic:") ? "Synthetic" : "File"})
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Ambient Sound Library */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-50">Ambient Sound Library</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] overflow-y-auto">
            <ul className="space-y-2">
              {AMBIENT_SOUNDS_LIBRARY.map((ambient) => (
                <li
                  key={ambient.id}
                  className="p-2 border rounded-md bg-gray-50 dark:bg-gray-700 flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium text-purple-600 dark:text-purple-400">{ambient.name}</span> (
                    {ambient.src.startsWith("synthetic:") ? "Synthetic" : "File"})
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleAmbientSoundPreview(ambient, ambient.volume ?? 0.5)}
                      disabled={isPlaying}
                    >
                      <Play className="h-4 w-4" />
                      <span className="sr-only">Preview</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => stopAmbientSoundPreview(ambient.id)}
                      disabled={isPlaying}
                    >
                      <StopCircle className="h-4 w-4" />
                      <span className="sr-only">Stop Preview</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

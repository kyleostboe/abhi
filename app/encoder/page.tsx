import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Navigation } from "@/components/navigation"
import { VisualTimeline } from "@/components/visual-timeline"
import { cn, formatTime, formatFileSize } from "@/lib/utils"
import { getAudioContext, playNote, bufferToWav } from "@/lib/audio-utils"
import { INSTRUCTIONS_LIBRARY, SOUND_CUES_LIBRARY, MUSICAL_NOTES, AMBIENT_SOUNDS_LIBRARY, NOTE_FREQUENCIES, generateSyntheticSound, generateAmbientSound } from "@/lib/meditation-data"
import { EVENT_COLORS } from "@/lib/constants"
import { useMobile } from "@/hooks/use-mobile"
import { useToast } from "@/components/ui/use-toast"
import type { Instruction, SoundCue, TimelineEvent, AmbientSound as AmbientSoundType } from "@/lib/types"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Volume2, Wand2, Download, Settings2, AlertTriangle, Music2, Mic, StopCircle, Play, PlusCircle, CircleDotDashed, Trash2, Info, BookText, Copy } from 'lucide-react'

export default function EncoderPage() {
  const { toast } = useToast();

  // == States for Labs ==
  const [meditationTitle, setMeditationTitle] = useState<string>("My Custom Meditation")
  const [labsTotalDuration, setLabsTotalDuration] = useState<number>(600)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [selectedLibraryInstruction, setSelectedLibraryInstruction] = useState<Instruction | null>(null)
  const [customInstructionText, setCustomInstructionText] = useState<string>("")
  const [selectedSoundCue, setSelectedSoundCue] = useState<SoundCue | null>(null)
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [readyToAddToTimelineRecording, setReadyToAddToTimelineRecording] = useState<{
    url: string
    duration: number
    label: string
  } | null>(null)
  const [recordedBlobs, setRecordedBlobs] = useState<Blob[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const labsAudioRef = useRef<HTMLAudioElement | null>(null)
  const instructionCategories = Array.from(new Set(INSTRUCTIONS_LIBRARY.map((instr) => instr.category)))
  const [recordingLabel, setRecordingLabel] = useState<string>("")

  // Audio generation states
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false)
  const [generationProgress, setGenerationProgress] = useState<number>(0)
  const [generationStep, setGenerationStep] = useState<string>("")
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null)

  const [backgroundSounds, setBackgroundSounds] = useState<
    Array<{
      id: string
      name: string
      src: string
      volume: number
    }>
  >([])
  const [masterBackgroundVolume, setMasterBackgroundVolume] = useState<number>(0.5)

  const backgroundAudioRef = useRef<HTMLAudioElement | AudioBufferSourceNode | null>(null)
  const [currentPlayingBackgroundSoundId, setCurrentPlayingBackgroundSoundId] = useState<string | null>(null)

  const isMobileDevice = useMobile()

  // Helper function to add events to timelineEvents without automatic spacing
  const addEventToTimeline = useCallback((newEvent: TimelineEvent) => {
    setTimelineEvents((prevEvents) => {
      const updatedEvents = [...prevEvents, newEvent]
      return updatedEvents.sort((a, b) => {
        if (a.startTime === b.startTime) {
          const aIndex = prevEvents.findIndex((e) => e.id === a.id)
          const bIndex = prevEvents.findIndex((e) => e.id === b.id)
          return aIndex - bIndex
        }
        return a.startTime - b.startTime
      })
    })
  }, [])

  const handleAddInstructionSoundEvent = () => {
    const instructionTextToAdd = customInstructionText.trim()

    if (!instructionTextToAdd) {
      toast({
        title: "Missing Instruction",
        description: "Please enter an instruction.",
        variant: "destructive",
      })
      return
    }
    if (!selectedSoundCue) {
      toast({ title: "Missing Sound Cue", description: "Please select a sound cue.", variant: "destructive" })
      return
    }

    const maxExistingTime = timelineEvents.length > 0 ? Math.max(...timelineEvents.map((e) => e.startTime)) : 0
    const newStartTime = timelineEvents.length > 0 ? maxExistingTime + 10 : 0

    const newEvent: TimelineEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: "instruction_sound",
      startTime: newStartTime,
      instructionText: instructionTextToAdd,
      soundCueId: selectedSoundCue.id,
      soundCueName: selectedSoundCue.name,
      soundCueSrc: selectedSoundCue.src,
      color: EVENT_COLORS[timelineEvents.length % EVENT_COLORS.length],
    }
    addEventToTimeline(newEvent)
    setCustomInstructionText("")
    toast({
      title: "Event Added",
      description: `"${instructionTextToAdd.substring(0, 30)}..." with ${selectedSoundCue.name} added.`,
    })
  }

  const startRecording = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mimeType = MediaRecorder.isTypeSupported("audio/mp4;codecs=aac")
          ? "audio/mp4;codecs=aac"
          : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : ""

        if (!mimeType) {
          toast({
            title: "Unsupported Audio Format",
            description: "Your browser does not support a compatible audio recording format.",
            variant: "destructive",
          })
          return
        }

        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType })
        const blobs: Blob[] = []

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            blobs.push(event.data)
          }
        }

        mediaRecorderRef.current.onstop = async () => {
          const blob = new Blob(blobs, { type: mimeType })
          const url = URL.createObjectURL(blob)

          const tempAudio = new Audio()
          tempAudio.preload = "metadata"
          tempAudio.src = url

          tempAudio.onloadedmetadata = () => {
            const duration =
              tempAudio.duration && !isNaN(tempAudio.duration) && isFinite(tempAudio.duration) ? tempAudio.duration : 0

            setReadyToAddToTimelineRecording({
              url,
              duration,
              label: recordingLabel.trim(),
            })
            setRecordedBlobs([blob])
            URL.revokeObjectURL(url)
            toast({ title: "Recording Stopped", description: `Duration: ${formatTime(duration)}` })
          }

          tempAudio.onerror = (e) => {
            console.error("Error loading recorded audio metadata:", e)
            toast({
              title: "Recording Error",
              description: "Could not load recorded audio metadata. Try again.",
              variant: "destructive",
            })
            URL.revokeObjectURL(url)
            setReadyToAddToTimelineRecording(null)
          }

          if (mediaRecorderRef.current?.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
          }
        }

        mediaRecorderRef.current.start()
        setIsRecording(true)
        setReadyToAddToTimelineRecording(null)
        setRecordedBlobs([])
        toast({ title: "Recording Started" })
      } catch (err) {
        toast({ title: "Microphone Error", description: "Could not access microphone.", variant: "destructive" })
      }
    } else {
      toast({
        title: "Unsupported",
        description: "Audio recording not supported by your browser.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const updateEventStartTime = (eventId: string, newTime: number) => {
    setTimelineEvents((prev) => {
      const updated = prev.map((event) =>
        event.id === eventId ? { ...event, startTime: Math.max(0, Math.min(newTime, labsTotalDuration)) } : event,
      )
      return updated.sort((a, b) => {
        if (a.startTime === b.startTime) {
          const aIndex = prev.findIndex((e) => e.id === a.id)
          const bIndex = prev.findIndex((e) => e.id === b.id)
          return aIndex - bIndex
        }
        return a.startTime - b.startTime
      })
    })
  }

  const removeTimelineEvent = (eventId: string) => {
    setTimelineEvents((prev) => prev.filter((event) => event.id !== eventId))
    toast({ title: "Event Removed" })
  }

  const handleDuplicateEvent = useCallback((eventToDuplicate: TimelineEvent) => {
    const newEvent: TimelineEvent = {
      ...eventToDuplicate,
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      startTime: eventToDuplicate.startTime + 10,
    }
    addEventToTimeline(newEvent)
    toast({ title: "Event Duplicated", description: `"${newEvent.instructionText || newEvent.recordedInstructionLabel}" duplicated.` })
  }, [addEventToTimeline, toast])

  const handleMeditationTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target?.value
    if (typeof value === "string") {
      setMeditationTitle(value)
    }
  }

  const handleCustomInstructionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target?.value
    if (typeof value === "string") {
      setCustomInstructionText(value)
      setSelectedLibraryInstruction(null)
    }
  }

  const handleRecordingLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target?.value
    if (typeof value === "string") {
      setRecordingLabel(value)
    }
  }

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target?.value
    if (typeof value === "string" && !isNaN(Number(value))) {
      setLabsTotalDuration(Math.max(60, Number(value) * 60) || 60)
    }
  }

  const toggleBackgroundSoundPreview = useCallback(
    async (sound: AmbientSoundType) => {
      const audioEl = backgroundAudioRef.current
      const isSynthetic = sound.src.startsWith("synthetic:")
      const isCurrentlyPlaying = currentPlayingBackgroundSoundId === sound.id && audioEl && !audioEl.paused

      if (isCurrentlyPlaying) {
        if (audioEl instanceof AudioBufferSourceNode) {
          audioEl.stop()
        } else if (audioEl instanceof HTMLAudioElement) {
          audioEl.pause()
        }
        setCurrentPlayingBackgroundSoundId(null)
        toast({ title: "Preview Paused", description: `${sound.name} preview paused.` })
        return
      }

      if (audioEl) {
        if (audioEl instanceof AudioBufferSourceSourceNode) {
          audioEl.stop()
        } else if (audioEl instanceof HTMLAudioElement) {
          audioEl.pause()
          audioEl.src = ""
        }
        backgroundAudioRef.current = null
      }

      try {
        const audioContext = getAudioContext()
        if (audioContext.state === "suspended") {
          await audioContext.resume()
        }

        if (isSynthetic) {
          const tempCtx = new OfflineAudioContext(1, audioContext.sampleRate * 5, audioContext.sampleRate)
          await generateAmbientSound(sound, tempCtx, 5, sound.volume || 0.5)
          const renderedBuffer = await tempCtx.startRendering()

          const source = audioContext.createBufferSource()
          source.buffer = renderedBuffer
          source.loop = true
          const gainNode = audioContext.createGain()
          source.connect(gainNode)
          gainNode.connect(audioContext.destination)
          gainNode.gain.value = (sound.volume || 0.5) * masterBackgroundVolume * 0.5
          source.start(0)

          backgroundAudioRef.current = source
        } else {
          const audio = new Audio(sound.src)
          audio.loop = true
          audio.volume = (sound.volume || 0.5) * masterBackgroundVolume * 0.5
          await audio.play().catch((e) => console.error("Error playing background audio:", e))
          backgroundAudioRef.current = audio
        }

        setCurrentPlayingBackgroundSoundId(sound.id)
        toast({ title: "Playing Preview", description: `Now playing: ${sound.name}` })
      } catch (error) {
        console.error("Failed to play background sound:", error)
        toast({
          title: "Background Sound Error",
          description: `Could not play ${sound.name}. Error: ${error instanceof Error ? error.message : "Unknown"}`,
          variant: "destructive",
        })
        setCurrentPlayingBackgroundSoundId(null)
      }
    },
    [currentPlayingBackgroundSoundId, masterBackgroundVolume, toast],
  )

  const stopBackgroundSound = useCallback(() => {
    if (backgroundAudioRef.current) {
      if (backgroundAudioRef.current instanceof AudioBufferSourceNode) {
        backgroundAudioRef.current.stop()
      } else if (backgroundAudioRef.current instanceof HTMLAudioElement) {
        backgroundAudioRef.current.pause()
        backgroundAudioRef.current.src = ""
      }
      backgroundAudioRef.current = null
      setCurrentPlayingBackgroundSoundId(null)
      toast({ title: "Preview Stopped", description: "Background sound preview stopped." })
    }
  }, [toast])

  useEffect(() => {
    if (backgroundAudioRef.current) {
      if (backgroundAudioRef.current instanceof HTMLAudioElement) {
        const currentSound = AMBIENT_SOUNDS_LIBRARY.find((s) => s.id === currentPlayingBackgroundSoundId)
        if (currentSound) {
          backgroundAudioRef.current.volume = (currentSound.volume || 0.5) * masterBackgroundVolume * 0.5
        }
      }
    }
  }, [masterBackgroundVolume, currentPlayingBackgroundSoundId])

  useEffect(() => {
    labsAudioRef.current = new Audio()
    labsAudioRef.current.preload = "none"
    labsAudioRef.current.volume = 0.7
    if (labsAudioRef.current) {
      labsAudioRef.current.onerror = (e) => console.warn("Labs Audio error:", e)
    }

    return () => {
      if (labsAudioRef.current) {
        labsAudioRef.current.pause()
        labsAudioRef.current.src = ""
        labsAudioRef.current = null
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
      stopBackgroundSound()
    }
  }, [stopBackgroundSound])

  const handleExportAudio = async () => {
    setIsGeneratingAudio(true)
    setGenerationProgress(0)
    setGenerationStep("Initializing...")

    try {
      const maxAudioDuration = labsTotalDuration

      const ctx = new OfflineAudioContext({
        numberOfChannels: 1,
        sampleRate: 44100,
        length: Math.ceil(maxAudioDuration * 44100),
      })

      let processedEventsCount = 0
      const totalEvents = timelineEvents.length

      for (const event of timelineEvents) {
        const eventStartTime = event.startTime

        if (event.type === "instruction_sound") {
          setGenerationStep(`Adding sound: ${event.soundCueName || "Sound Cue"}`)

          if (event.soundCueSrc?.startsWith("synthetic:")) {
            const soundCue = SOUND_CUES_LIBRARY.find((cue) => cue.id === event.soundCueId)
            if (soundCue) {
              await generateSyntheticSound(soundCue, ctx)
            }
          } else if (event.soundCueSrc?.startsWith("musical:")) {
            const noteMatch = event.soundCueSrc.match(/musical:([A-G])(\d)/)
            if (noteMatch) {
              const note = noteMatch[1]
              const octave = Number.parseInt(noteMatch[2])

              const frequency = NOTE_FREQUENCIES[`${note}${octave}` as keyof typeof NOTE_FREQUENCIES]
              if (frequency) {
                const oscillator = ctx.createOscillator()
                const gainNode = ctx.createGain()

                oscillator.connect(gainNode)
                gainNode.connect(ctx.destination)

                oscillator.type = "sine"
                oscillator.frequency.setValueAtTime(frequency, eventStartTime)

                const eventDuration = 0.8
                const peakVolume = 0.4

                gainNode.gain.setValueAtTime(0, eventStartTime)
                gainNode.gain.exponentialRampToValueAtTime(peakVolume, eventStartTime + 0.05)
                gainNode.gain.exponentialRampToValueAtTime(0.001, eventStartTime + eventDuration)

                oscillator.start(eventStartTime)
                oscillator.stop(eventStartTime + eventDuration)
              }
            }
          } else if (event.soundCueSrc) {
            try {
              const response = await fetch(event.soundCueSrc)
              const arrayBuffer = await response.arrayBuffer()
              const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
              const source = ctx.createBufferSource()
              const gainNode = ctx.createGain()

              source.buffer = audioBuffer
              source.connect(gainNode)
              gainNode.connect(ctx.destination)
              gainNode.gain.setValueAtTime(0.4, eventStartTime)
              source.start(eventStartTime)
            } catch (error) {
              console.warn(`Could not load recorded audio: ${event.soundCueSrc}`, error)
            }
          }
        } else if (event.type === "recorded_voice" && event.recordedAudioUrl) {
          setGenerationStep(`Adding recorded voice: ${event.recordedInstructionLabel || "Untitled"}`)

          try {
            const response = await fetch(event.recordedAudioUrl)
            const arrayBuffer = await response.arrayBuffer()
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
            const source = ctx.createBufferSource()
            const gainNode = ctx.createGain()

            source.buffer = audioBuffer
            source.connect(gainNode)
            gainNode.connect(ctx.destination)
            gainNode.gain.setValueAtTime(0.8, eventStartTime)
            source.start(eventStartTime)
          } catch (error) {
            console.warn(`Could not load recorded audio: ${event.recordedAudioUrl}`, error)
          }
        }

        processedEventsCount++
        setGenerationProgress(Math.floor((processedEventsCount / totalEvents) * 80))
      }

      for (const bgSound of backgroundSounds) {
        if (bgSound.volume > 0) {
          try {
            if (bgSound.src.startsWith("synthetic:")) {
              const ambientSoundDef = AMBIENT_SOUNDS_LIBRARY.find((s) => s.id === bgSound.id) as AmbientSoundType
              if (ambientSoundDef) {
                await generateAmbientSound(
                  ambientSoundDef,
                  ctx,
                  maxAudioDuration,
                  bgSound.volume * masterBackgroundVolume * 0.3,
                )
              }
            } else {
              const response = await fetch(bgSound.src)
              const arrayBuffer = await response.arrayBuffer()
              const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
              const source = ctx.createBufferSource()
              const gainNode = ctx.createGain()
              source.buffer = audioBuffer
              source.connect(gainNode)
              gainNode.connect(ctx.destination)
              const finalVolume = bgSound.volume * masterBackgroundVolume * 0.3
              gainNode.gain.setValueAtTime(finalVolume, 0)
              source.loop = true
              source.start(0)
              source.stop(maxAudioDuration)
            }
          } catch (error) {
            console.warn(`Could not load background sound: ${bgSound.src}`, error)
          }
        }
      }

      setGenerationStep("Rendering audio...")
      setGenerationProgress(80)

      const rendered = await ctx.startRendering()

      if (rendered.length === 0) {
        throw new Error("Rendered audio buffer is empty. No audio content was generated.")
      }

      const wavBlob = await bufferToWav(
        rendered,
        true, // compatibilityMode is always "high" in this context for export
        (p) => setGenerationProgress(90 + Math.floor(p * 0.1)),
        isMobileDevice,
      )
      if (wavBlob.size === 0) {
        throw new Error("Generated WAV blob is empty. WAV conversion failed or resulted in no data.")
      }
      const url = URL.createObjectURL(wavBlob)
      setGeneratedAudioUrl(url)

      if (labsAudioRef.current) {
        labsAudioRef.current.src = url
        labsAudioRef.current.volume = 0.7 // Default volume for playback
      }

      setIsGeneratingAudio(false)
      setGenerationProgress(100)
      setGenerationStep("Export Complete")

      toast({ title: "Export Complete", description: "Timeline audio exported with sound cues included!" })
    } catch (error) {
      console.error("Audio export failed:", error)
      toast({
        title: "Audio Export Failed",
        description: `Could not export audio. Error: ${error instanceof Error ? error.message : "Unknown"}`,
        variant: "destructive",
      })
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
      <Navigation />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-white/40 overflow-hidden dark:bg-gray-900/80 transition-colors duration-300 ease-in-out"
        style={{
          borderRadius: "3rem 2.5rem 3rem 2.5rem",
        }}
        role="application"
      >
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20 dark:from-amber-600/20 dark:via-rose-500/15 dark:via-purple-600/10 dark:to-teal-500/20"></div>
            <div className="absolute top-2 left-8 w-16 h-12 bg-gradient-to-br from-emerald-300/30 to-teal-400/25 rounded-full transform rotate-12 dark:from-emerald-500/30 dark:to-teal-600/25"></div>
            <div className="absolute top-6 right-12 w-20 h-8 bg-gradient-to-bl from-rose-300/25 to-purple-400/20 rounded-full transform -rotate-6 dark:from-rose-500/25 dark:to-purple-600/20"></div>
            <div className="absolute top-1 left-1/3 w-12 h-16 bg-gradient-to-tr from-amber-300/20 to-orange-400/15 rounded-full transform rotate-45 dark:from-amber-500/20 dark:to-orange-600/15"></div>
            <div className="absolute top-8 right-1/4 w-14 h-10 bg-gradient-to-tl from-blue-300/25 to-indigo-400/20 rounded-full transform -rotate-12 dark:from-blue-500/25 dark:to-indigo-600/20"></div>
          </div>
          <div className="relative text-center px-[69px]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1
                className="text-5xl text-transparent bg-clip-text bg-gradient-to-r from-logo-amber via-logo-rose via-logo-purple to-logo-teal dark:from-logo-amber dark:via-logo-rose dark:via-logo-purple dark:to-logo-teal transform hover:scale-105 transition-transform duration-700 ease-out font-black md:text-6xl mb-0 tracking-tighter text-center mt-16"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  textShadow: "0 0 25px rgba(139, 69, 69, 0.25)",
                }}
              >
                abhī
              </h1>
              <div className="font-black text-logo-rose-600 font-serif mb-[7px] text-xs">Meditation Tool</div>
              <div className="flex justify-center items-center mb-4 space-x-[3px]">
                <div className="bg-gradient-to-br from-logo-teal to-logo-emerald rounded-sm transform rotate-12 dark:from-logo-teal dark:to-logo-emerald w-[13px] h-[13px]"></div>
                <div className="bg-gradient-to-br from-logo-rose to-pink-300 rounded-full dark:from-logo-rose dark:to-pink-400 h-[9px] w-[9px]"></div>
                <div className="w-4 bg-gradient-to-br from-logo-amber to-orange-300 rounded-full transform -rotate-6 dark:from-logo-amber dark:to-orange-400 h-[9px]"></div>
                <div className="dark:bg-white px-0 mx-0 border-gray-600 rounded-none w-[51px] text-logo-rose-600 border-0 h-[5px] bg-gray-600"></div>
                <div className="w-4 bg-gradient-to-br from-logo-purple to-indigo-300 rounded-full transform rotate-6 dark:from-logo-purple dark:to-indigo-400 h-[9px] pl-0 ml-2"></div>
                <div className="bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full dark:from-blue-500 dark:to-cyan-400 h-[9px] w-[9px]"></div>
                <div className="bg-gradient-to-br from-logo-emerald to-logo-teal rounded-sm transform -rotate-12 dark:from-logo-emerald dark:to-logo-teal w-[13px] h-[13px]"></div>
              </div>

              <div className="flex justify-center items-center mb-6 space-y-4 flex-row my-[33px]">
                <div className="grid mx-auto grid-cols-2 bg-gray-100/70 p-1 rounded-md dark:bg-gray-800/70 font-serif text-gray-600 w-64 h-auto shadow-inner rounded-md">
                  <button
                    onClick={() => window.location.href = "/"}
                    className={cn(
                      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-black text-sm py-3 tracking-tight",
                      "text-gray-600 dark:text-gray-600",
                    )}
                  >
                    Adjuster
                  </button>
                  <button
                    onClick={() => window.location.href = "/encoder"}
                    className={cn(
                      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 py-3 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-black text-sm text-gray-600 tracking-tight",
                      "bg-white text-gray-600 shadow-sm dark:shadow-white/20 dark:bg-gray-700 dark:text-gray-600",
                    )}
                  >
                    Encoder
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="px-6 md:px-10 pb-10 font-serif font-black">
            <motion.div
              key="encoder-note"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-4 mb-6 border-gray-600 rounded-md text-gray-600 font-serif font-black dark:border-gray-700 dark:text-gray-300 max-w-2xl mx-auto text-center shadow-inner text-xs border-solid border-2"
            >
              <p>
                Create custom meditations by associating instructions with sound cues and placing them along a
                timeline. This tool aims to help bridge the gap between guided and self-directed meditation.
              </p>
            </motion.div>

            <motion.div
              className="text-logo-rose"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="overflow-hidden border-2 border-logo-rose-600 shadow-inner bg-white dark:bg-gray-900 max-w-2xl mx-auto rounded-2xl">
                <div className="py-3 px-6 text-center">
                  <h3 className="flex items-center justify-center font-black text-logo-rose-600 text-left">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Session Setup
                  </h3>
                </div>
                <div className="p-6 bg-white text-sm font-black pt-3">
                  <div className="grid md:grid-cols-2 gap-6 text-logo-rose-600">
                    <div className="text-center">
                      <Label htmlFor="labs-title" className="text-logo-rose-600 font-black">
                        Meditation Title
                      </Label>
                      <Input
                        id="labs-title"
                        value={meditationTitle}
                        onChange={handleMeditationTitleChange}
                        placeholder="My Custom Meditation"
                        className="mt-1 text-xs font-black text-logo-rose-600 shadow-inner border border-gray-600 focus:ring-logo-rose-600 focus:border-logo-rose-600"
                      />
                    </div>
                    <div className="text-center">
                      <Label htmlFor="labs-duration" className="text-logo-rose-600 font-black">
                        Meditation Duration (minutes)
                      </Label>
                      <Input
                        id="labs-duration"
                        type="number"
                        value={labsTotalDuration / 60}
                        onChange={handleDurationChange}
                        min="1"
                        className="mt-1 text-xs font-black text-logo-rose-600 shadow-inner border border-gray-600 focus:ring-logo-rose-600 focus:border-logo-rose-600"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="p-6 bg-transparent px-0 py-3 pb-0 pt-0"
              >
                <div className="flex items-center justify-center mb-2">
                  <BookText className="mr-2 text-indigo-400 h-4 w-4" />
                  <span className="text-indigo-400 font-black text-center text-base">Instructions</span>
                </div>
                <div className="p-0.5 bg-gradient-to-r from-logo-purple-500 to-logo-blue-500 px-0.5 py-0.5 border-indigo-200 border-2 rounded-2xl shadow-md">
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border-rose-200 border">
                    <div className="text-center">
                      <Textarea
                        id="custom-instruction"
                        value={customInstructionText}
                        onChange={handleCustomInstructionChange}
                        placeholder="Enter an instruction..."
                        className="mt-2 text-sm font-serif font-black text-indigo-400 placeholder-indigo-400 resize-none bg-transparent border-none focus:border-none focus:ring-0 focus:ring-offset-0 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900 h-full">
                  <div className="bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 py-3 px-6 dark:from-logo-teal-600 dark:to-logo-emerald-600 text-center">
                    <h3 className="text-white flex items-center font-black text-left">
                      <Music2 className="h-4 w-4 mr-2" />
                      Sound Cues
                    </h3>
                  </div>
                  <div className="p-6 space-y-4 font-black">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="musical-notes">
                        <AccordionTrigger className="text-logo-teal-500 dark:text-logo-teal-500 hover:no-underline py-3 font-serif font-black">
                          Musical Notes
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <Accordion type="single" collapsible className="w-full">
                            {Object.entries(
                              Object.entries(MUSICAL_NOTES).reduce(
                                (acc, [_, notes]) => {
                                  notes.forEach((note) => {
                                    const octave = `Octave ${note.octave}`
                                    if (!acc[octave]) acc[octave] = []
                                    acc[octave].push(note)
                                  })
                                  return acc
                                },
                                {} as Record<string, any[]>,
                              ),
                            ).map(([octave, notes]) => (
                              <AccordionItem
                                value={octave}
                                key={octave}
                                className="border-b border-gray-100 dark:border-gray-800"
                              >
                                <AccordionTrigger className="text-logo-teal-500 dark:text-logo-teal-500 hover:no-underline py-3 font-serif font-black">
                                  {octave}
                                </AccordionTrigger>
                                <AccordionContent className="pb-4">
                                  <div className="space-y-2 text-gray-600">
                                    {notes.map((note) => (
                                      <div key={note.id} className="flex items-center gap-2 font-black font-serif">
                                        <Button
                                          variant={selectedSoundCue?.id === note.id ? "default" : "ghost"}
                                          size="sm"
                                          className={`flex-1 justify-start font-black font-serif text-gray-600 ${selectedSoundCue?.id === note.id ? "bg-white text-gray-600 border border-gray-600 hover:bg-gray-50 dark:bg-white dark:text-gray-600 dark:border-gray-600 dark:hover:bg-gray-50" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                                          onClick={async () => {
                                            setSelectedSoundCue({
                                              id: note.id,
                                              name: note.name,
                                              src: `musical:${note.note}${note.octave}`,
                                            })
                                            await playNote(note.note, note.octave)
                                          }}
                                        >
                                          {note.name}
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={async () => await playNote(note.note, note.octave)}
                                          className="hover:bg-logo-emerald-50 dark:hover:bg-logo-emerald-900"
                                          title={`Preview ${note.name}`}
                                        >
                                          <Play className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="miscellaneous">
                        <AccordionTrigger className="text-logo-teal-500 dark:text-logo-teal-500 hover:no-underline py-3 font-serif font-black">
                          Miscellaneous
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="space-y-2 text-gray-600">
                            {SOUND_CUES_LIBRARY.map((cue) => (
                              <div key={cue.id} className="flex items-center gap-2 font-black font-serif">
                                <Button
                                  variant={selectedSoundCue?.id === cue.id ? "default" : "ghost"}
                                  size="sm"
                                  className={`flex-1 justify-start font-black font-serif text-gray-600 ${selectedSoundCue?.id === cue.id ? "bg-white text-gray-600 border border-gray-600 hover:bg-gray-50 dark:bg-white dark:text-gray-600 dark:border-gray-600 dark:hover:bg-gray-50" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                                  onClick={async () => {
                                    setSelectedSoundCue({ id: cue.id, name: cue.name, src: cue.src })
                                    const audioContext = getAudioContext();
                                    await generateSyntheticSound(cue, audioContext);
                                  }}
                                >
                                  {cue.name}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    const audioContext = getAudioContext();
                                    await generateSyntheticSound(cue, audioContext);
                                  }}
                                  className="hover:bg-logo-emerald-50 dark:hover:bg-logo-emerald-900"
                                  title={`Preview ${cue.name}`}
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                    <Button
                      className="w-full bg-transparent text-logo-teal-500 border border-logo-teal-500 hover:bg-logo-teal-50 dark:bg-gray-900 dark:text-logo-teal-500 dark:border-logo-teal-500 dark:hover:bg-gray-800 font-serif font-black"
                      onClick={handleAddInstructionSoundEvent}
                      disabled={!customInstructionText.trim() || !selectedSoundCue}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      <span className="font-black font-serif">Add to Timeline</span>
                    </Button>
                  </div>
                </Card>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900 h-full">
                  <div className="bg-gradient-to-r from-logo-rose-500 to-logo-amber-500 py-3 px-6 dark:from-logo-rose-600 dark:to-logo-amber-600 text-center">
                    <h3 className="text-white flex items-center font-black">
                      <Mic className="h-4 w-4 mr-2" />
                      Voice Recording
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="text-left">
                      <Label
                        htmlFor="recording-label"
                        className="text-logo-rose-600 dark:text-logo-rose-400 font-black"
                      >
                        Label
                      </Label>
                      <Input
                        id="recording-label"
                        value={recordingLabel}
                        onChange={handleRecordingLabelChange}
                        placeholder="Describe this recording..."
                        className="mt-1 text-sm font-black text-logo-rose placeholder-logo-rose"
                      />
                    </div>
                    <Button
                      onClick={isRecording ? stopRecording : startRecording}
                      variant={isRecording ? "destructive" : "default"}
                      className={cn(
                        "w-full font-black",
                        isRecording
                          ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white dark:from-gray-700 dark:to-gray-800"
                          : "bg-transparent text-logo-rose-600 border border-logo-rose-600 dark:text-logo-rose-400 dark:border-logo-rose-400 hover:bg-logo-rose-50 dark:hover:bg-gray-800",
                      )}
                    >
                      {isRecording ? (
                        <>
                          <StopCircle className="mr-2 h-4 w-4" />
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <Mic className="mr-2 h-4 w-4" />
                          Start Recording
                        </>
                      )}
                    </Button>
                    <AnimatePresence>
                      {readyToAddToTimelineRecording && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 border-t border-gray-100 dark:border-gray-800 pt-4"
                        >
                          <div className="space-y-2">
                            <audio
                              controls
                              src={readyToAddToTimelineRecording.url}
                              className="w-full"
                              preload="metadata"
                            />
                            <p className="text-xs text-gray-500 text-center">
                              Duration: {formatTime(readyToAddToTimelineRecording.duration)}
                            </p>
                          </div>
                          <Button
                            onClick={() => {
                              if (!readyToAddToTimelineRecording?.label.trim()) {
                                toast({
                                  title: "Missing Label",
                                  description: "Please provide a label for the recording.",
                                  variant: "destructive",
                                })
                                return
                              }

                              const maxExistingTime =
                                timelineEvents.length > 0 ? Math.max(...timelineEvents.map((e) => e.startTime)) : 0
                              const newStartTime = timelineEvents.length > 0 ? maxExistingTime + 10 : 0

                              const newEvent: TimelineEvent = {
                                id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                                type: "recorded_voice",
                                startTime: newStartTime,
                                recordedAudioUrl: readyToAddToTimelineRecording.url,
                                recordedInstructionLabel: readyToAddToTimelineRecording.label.trim(),
                                duration: readyToAddToTimelineRecording.duration,
                                color: EVENT_COLORS[timelineEvents.length % EVENT_COLORS.length],
                              }

                              addEventToTimeline(newEvent)

                              setReadyToAddToTimelineRecording(null)
                              setRecordedBlobs([])
                              setRecordingLabel("")

                              toast({
                                title: "Recording Added",
                                description: `"${readyToAddToTimelineRecording.label.trim()}" added to timeline.`,
                              })
                            }}
                            className="w-full bg-white text-logo-rose-600 border border-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-logo-rose-400 dark:border-gray-600 dark:hover:bg-gray-800 font-black"
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add to Timeline
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
                <div className="bg-gradient-to-r from-gray-700 to-gray-800 py-4 px-6 dark:from-gray-800 dark:to-gray-900">
                  <h3 className="text-white flex items-center font-black text-base">
                    <CircleDotDashed className="h-5 w-5 mr-2" />
                    Timeline Editor
                  </h3>
                </div>
                <div className="p-6 pb-6">
                  <VisualTimeline
                    events={timelineEvents}
                    totalDuration={labsTotalDuration}
                    onUpdateEvent={updateEventStartTime}
                    onRemoveEvent={removeTimelineEvent}
                    onDuplicateEvent={handleDuplicateEvent}
                  />
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                    <h4 className="font-black dark:text-gray-200 text-gray-600 mb-4 text-base">
                      Background Sound Mixer
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h5 className="text-sm font-black text-gray-600 dark:text-gray-300">Ambient Sounds</h5>
                        <div className="space-y-2">
                          {AMBIENT_SOUNDS_LIBRARY.map((sound) => (
                            <div
                              key={sound.id}
                              className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-inner"
                            >
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleBackgroundSoundPreview(sound)}
                                className={`${currentPlayingBackgroundSoundId === sound.id ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" : ""}`}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                <span className="font-black text-gray-600 dark:text-gray-300">{sound.name}</span>
                              </Button>

                              {backgroundSounds.some((s) => s.id === sound.id) && (
                                <div className="flex-1 flex items-center space-x-2">
                                  <Volume2 className="h-3 w-3 text-gray-500" />
                                  <Slider
                                    value={[backgroundSounds.find((s) => s.id === sound.id)?.volume || 0.3]}
                                    min={0}
                                    max={1}
                                    step={0.1}
                                    onValueChange={(value) => {
                                      setBackgroundSounds((prev) =>
                                        prev.map((s) => (s.id === sound.id ? { ...s, volume: value[0] } : s)),
                                      )
                                    }}
                                    className="flex-1"
                                    rangeClassName="bg-gradient-to-r from-gray-700 to-gray-800 dark:from-gray-800 dark:to-gray-900"
                                  />
                                  <span className="text-xs text-gray-500 w-8">
                                    {Math.round(
                                      (backgroundSounds.find((s) => s.id === sound.id)?.volume || 0) * 100,
                                    )}
                                    %
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h5 className="text-sm font-black text-gray-600 dark:text-gray-300">
                          Custom Background Audio
                        </h5>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                const url = URL.createObjectURL(file)
                                const customSound = {
                                  id: `custom_${Date.now()}`,
                                  name: file.name.replace(/\.[^/.]+$/, ""),
                                  src: url,
                                  volume: 0.3,
                                }
                                setBackgroundSounds((prev) => [...prev, customSound])
                              }
                            }}
                            className="hidden"
                            id="custom-background-upload"
                          />
                          <label htmlFor="custom-background-upload" className="cursor-pointer">
                            <div className="text-gray-500 dark:text-gray-400 text-sm">
                              <PlusCircle className="h-6 w-6 mx-auto mb-2" />
                              Upload Custom Audio
                            </div>
                          </label>
                        </div>

                        {backgroundSounds
                          .filter((s) => s.id.startsWith("custom_"))
                          .map((sound) => (
                            <div
                              key={sound.id}
                              className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 shadow-inner"
                            >
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setBackgroundSounds((prev) => prev.filter((s) => s.id !== sound.id))
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-black text-gray-700 dark:text-gray-300 flex-1 truncate">
                                {sound.name}
                              </span>
                              <div className="flex items-center space-x-2">
                                <Volume2 className="h-3 w-3" />
                                <Slider
                                  value={[sound.volume]}
                                  min={0}
                                  max={1}
                                  step={0.1}
                                  onValueChange={(value) => {
                                    setBackgroundSounds((prev) =>
                                      prev.map((s) => (s.id === sound.id ? { ...s, volume: value[0] } : s)),
                                    )
                                  }}
                                  className="w-20"
                                  rangeClassName="bg-gradient-to-r from-gray-700 to-gray-800 dark:from-gray-800 dark:to-gray-900"
                                />
                                <span className="text-xs text-gray-500 w-8">{Math.round(sound.volume * 100)}%</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {backgroundSounds.length > 0 && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-inner">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-black text-gray-600 dark:text-gray-300">
                            Master Background Volume:
                          </span>
                          <div className="flex-1 flex items-center space-x-2">
                            <Volume2 className="h-4 w-4" />
                            <Slider
                              value={[masterBackgroundVolume]}
                              min={0}
                              max={1}
                              step={0.1}
                              onValueChange={(value) => setMasterBackgroundVolume(value[0])}
                              className="flex-1"
                              rangeClassName="bg-gradient-to-r from-gray-700 to-gray-800 dark:from-gray-800 dark:to-gray-900"
                            />
                            <span className="text-sm text-gray-500 w-12">
                              {Math.round(masterBackgroundVolume * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Button
                onClick={handleExportAudio}
                disabled={isGeneratingAudio || timelineEvents.length === 0}
                className={cn(
                  "w-full py-7 text-lg font-medium tracking-wider rounded-xl transition-all",
                  "shadow-lg dark:shadow-white/20 hover:shadow-none active:shadow-none",
                  "bg-gradient-to-r from-logo-teal-500 to-logo-purple-500 text-white dark:from-logo-teal-700 dark:to-logo-purple-700",
                )}
              >
                <div className="flex items-center justify-center font-black">
                  {isGeneratingAudio && (
                    <div className="mr-3 h-5 w-5">
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291
                          A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </div>
                  )}
                  <Wand2 className="mr-2 w-4 h-4" />
                  <span className="text-base">{isGeneratingAudio ? "Generating..." : "Generate Audio"}</span>
                </div>
              </Button>
            </motion.div>
            {generatedAudioUrl && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="overflow-hidden border-none shadow-xl dark:shadow-white/25 bg-gradient-to-br from-logo-teal-50 to-logo-emerald-50 dark:from-logo-teal-950 dark:to-logo-emerald-950">
                  <div className="bg-gradient-to-r from-logo-teal-600 to-logo-emerald-600 py-3 px-6 dark:from-logo-teal-700 dark:to-logo-emerald-700">
                    <h3 className="text-white font-black">Generated Audio</h3>
                  </div>
                  <div className="p-6">
                    <h4 className="mb-2 dark:text-gray-300 font-black text-sm text-gray-600">{meditationTitle}</h4>
                    <div className="bg-white rounded-lg p-3 shadow-sm dark:shadow-white/10 mb-4 dark:bg-gray-700">
                      <audio controls className="w-full" src={generatedAudioUrl}></audio>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white/60 p-3 rounded-lg text-center dark:bg-gray-800/60 shadow-lg">
                        <div className="text-xs text-logo-teal-500 uppercase tracking-wide mb-1 dark:text-logo-teal-400">
                          Total Events
                        </div>
                        <div className="dark:text-black font-black text-gray-600">{timelineEvents.length}</div>
                      </div>
                      <div className="bg-white/60 p-3 rounded-lg text-center dark:bg-gray-800/60 shadow-lg">
                        <div className="text-xs text-logo-teal-500 uppercase tracking-wide mb-1 dark:text-logo-teal-400">
                          Total Duration
                        </div>
                        <div className="dark:text-black font-black text-gray-600">
                          {formatTime(labsTotalDuration)}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        const a = document.createElement("a")
                        a.href = generatedAudioUrl
                        a.download = `${meditationTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_meditation.wav`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                      }}
                      className="w-full py-4 rounded-xl shadow-md dark:shadow-white/20 bg-gradient-to-r from-logo-teal-600 to-logo-emerald-600 hover:from-logo-teal-700 hover:to-logo-emerald-700 transition-all border-none dark:from-logo-teal-700 dark:to-logo-emerald-700 dark:hover:from-logo-teal-800 dark:hover:to-logo-emerald-800"
                    >
                      <div className="flex items-center justify-center font-black">
                        <Download className="mr-2 h-5 w-5" />
                        Download Audio
                      </div>
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

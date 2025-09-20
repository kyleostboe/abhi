"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { MeditationLibrary, type SavedMeditation, type Playlist } from "@/lib/meditation-library"
import {
  Music,
  Volume2,
  Wand2,
  AlertTriangle,
  Music2,
  PlusCircle,
  CircleDotDashed,
  Mic,
  BookmarkPlus,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Navigation } from "@/components/navigation"
import { formatTime, formatFileSize } from "@/lib/audio-utils"
import { SaveMeditationDialog } from "@/components/save-meditation-dialog"
import { RecorderSection } from "@/components/recorder-section"
import { VisualTimeline } from "@/components/visual-timeline"

type NavigationPage = "home" | "library" | "contact" | "donate"

export default function HomePage() {
  const [activePage, setActivePage] = useState<NavigationPage>("home")

  const [activeMode, setActiveMode] = useState<"adjuster" | "encoder">("adjuster")
  const [file, setFile] = useState<File | null>(null)
  const [originalBuffer, setOriginalBuffer] = useState<AudioBuffer | null>(null)
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [processedUrl, setProcessedUrl] = useState<string | null>(null)
  const [targetDuration, setTargetDuration] = useState<number>(20)
  const [silenceThreshold, setSilenceThreshold] = useState<number>(0.01)
  const [minSilenceDuration, setMinSilenceDuration] = useState<number>(2)
  const [minSpacingDuration, setMinSpacingDuration] = useState<number>(0.5)
  const [preserveNaturalPacing, setPreserveNaturalPacing] = useState<boolean>(true)
  const [compatibilityMode, setCompatibilityMode] = useState<string>("standard")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isProcessingComplete, setIsProcessingComplete] = useState(false)
  const [audioAnalysis, setAudioAnalysis] = useState<any>(null)
  const [durationLimits, setDurationLimits] = useState<any>(null)
  const [actualDuration, setActualDuration] = useState<number | null>(null)
  const [pausesAdjusted, setPausesAdjusted] = useState<number>(0)
  const [processedFileSize, setProcessedFileSize] = useState<number>(0)
  const [memoryWarning, setMemoryWarning] = useState(false)
  const [isMobileDevice, setIsMobileDevice] = useState(false)

  // Encoder state
  const [meditationTitle, setMeditationTitle] = useState<string>("My Custom Meditation")
  const [encoderTotalDuration, setEncoderTotalDuration] = useState<number>(600)
  const [customInstructionText, setCustomInstructionText] = useState<string>("")
  const [selectedSoundCue, setSelectedSoundCue] = useState<any>(null)
  const [noteType, setNoteType] = useState<"piano" | "synth" | "harp">("piano")
  const [multiNoteMode, setMultiNoteMode] = useState<boolean>(false)
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])
  const [timelineEvents, setTimelineEvents] = useState<any[]>([])
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null)
  const [generatedAudioFileSize, setGeneratedAudioFileSize] = useState<number>(0)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)

  // Recording state
  const [recordingLabel, setRecordingLabel] = useState<string>("")
  const [isRecording, setIsRecording] = useState(false)
  const [readyToAddToTimelineRecording, setReadyToAddToTimelineRecording] = useState<any>(null)
  const [recordedBlobs, setRecordedBlobs] = useState<Blob[]>([])

  // Library page state
  const [meditations, setMeditations] = useState<SavedMeditation[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [activeTab, setActiveTab] = useState<"meditations" | "playlists">("meditations")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null)
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("")
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)
  const encoderAudioRef = useRef<HTMLAudioElement>(null)
  const recordingPreviewRef = useRef<HTMLAudioElement>(null)

  const { toast } = useToast()

  useEffect(() => {
    if (activePage === "library") {
      loadLibraryData()
    }

    // Detect mobile device
    setIsMobileDevice(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
  }, [activePage])

  const loadLibraryData = () => {
    setMeditations(MeditationLibrary.getAllMeditations())
    setPlaylists(MeditationLibrary.getAllPlaylists())
  }

  // File handling methods
  const handleFileSelectAction = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      processFileSelection(selectedFile)
    }
  }

  const handleDragOverAction = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDragLeaveAction = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDropAction = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const droppedFile = event.dataTransfer.files[0]
    if (droppedFile) {
      processFileSelection(droppedFile)
    }
  }

  const processFileSelection = async (selectedFile: File) => {
    setFile(selectedFile)
    // Add audio processing logic here
    toast({
      title: "File uploaded",
      description: `${selectedFile.name} has been uploaded successfully.`,
    })
  }

  const processAudioAdjusterAction = async () => {
    if (!originalBuffer) return
    setIsProcessing(true)
    // Add audio processing logic here
    setTimeout(() => {
      setIsProcessing(false)
      setIsProcessingComplete(true)
      toast({
        title: "Audio processed",
        description: "Your meditation has been adjusted successfully.",
      })
    }, 2000)
  }

  const downloadProcessedAudioAction = () => {
    if (processedUrl) {
      const a = document.createElement("a")
      a.href = processedUrl
      a.download = `${file?.name?.replace(/\.[^/.]+$/, "") || "meditation"}_adjusted.wav`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  // Encoder methods
  const handleMeditationTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMeditationTitle(e.target.value)
  }

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = Number.parseInt(e.target.value) || 1
    setEncoderTotalDuration(minutes * 60)
  }

  const handleCustomInstructionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomInstructionText(e.target.value)
  }

  const handleRecordingLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecordingLabel(e.target.value)
  }

  const handleNoteSelection = (note: any) => {
    if (multiNoteMode) {
      const noteString = `${note.note}${note.octave}`
      setSelectedNotes((prev) =>
        prev.includes(noteString) ? prev.filter((n) => n !== noteString) : [...prev, noteString],
      )
    } else {
      setSelectedSoundCue(note)
    }
  }

  const playSingleNote = async (note: string, octave: number, instrument: string) => {
    // Add note playing logic here
    console.log(`Playing ${note}${octave} on ${instrument}`)
  }

  const playChordPreview = () => {
    // Add chord playing logic here
    console.log("Playing chord:", selectedNotes)
  }

  const timelinePlaySingleNote = async (note: string, octave: number, instrument: string) => {
    return playSingleNote(note, octave, instrument)
  }

  const timelinePlayChordPreview = () => {
    return playChordPreview()
  }

  const handleAddInstructionSoundEvent = () => {
    if (!customInstructionText.trim() || (!selectedSoundCue && selectedNotes.length === 0)) return

    const newEvent = {
      id: Date.now().toString(),
      type: multiNoteMode && selectedNotes.length > 1 ? "chord" : "instruction",
      startTime: 0,
      instruction: customInstructionText.trim(),
      soundCue: selectedSoundCue,
      notes: selectedNotes,
      instrument: noteType,
    }

    setTimelineEvents((prev) => [...prev, newEvent])
    setCustomInstructionText("")
    setSelectedSoundCue(null)
    setSelectedNotes([])
  }

  const addEventToTimeline = (event: any) => {
    setTimelineEvents((prev) => [...prev, event])
  }

  const updateEventStartTime = (eventId: string, newStartTime: number) => {
    setTimelineEvents((prev) =>
      prev.map((event) => (event.id === eventId ? { ...event, startTime: newStartTime } : event)),
    )
  }

  const removeTimelineEvent = (eventId: string) => {
    setTimelineEvents((prev) => prev.filter((event) => event.id !== eventId))
  }

  const handleDuplicateEvent = (event: any) => {
    const duplicatedEvent = {
      ...event,
      id: Date.now().toString(),
      startTime: event.startTime + 30,
    }
    setTimelineEvents((prev) => [...prev, duplicatedEvent])
  }

  const startRecording = () => {
    setIsRecording(true)
    // Add recording logic here
  }

  const stopRecording = () => {
    setIsRecording(false)
    // Add recording stop logic here
  }

  const handleExportAudio = async () => {
    if (timelineEvents.length === 0) return
    setIsGeneratingAudio(true)

    // Add audio generation logic here
    setTimeout(() => {
      setIsGeneratingAudio(false)
      setGeneratedAudioUrl("data:audio/wav;base64,") // Placeholder
      setGeneratedAudioFileSize(1024 * 1024) // 1MB placeholder
      toast({
        title: "Audio generated",
        description: "Your custom meditation has been created successfully.",
      })
    }, 3000)
  }

  const HomeContent = () => (
    <div className="px-6 md:px-10 font-serif font-black pb-7">
      {/* Memory Warning */}
      {memoryWarning && activeMode === "adjuster" && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-yellow-100 to-amber-50 border border-yellow-300 shadow-sm">
          <div className="flex items-start">
            <AlertTriangle className="text-yellow-500 mr-3 flex-shrink-0 mt-0.5 w-5 h-5" />
            <div>
              <h3 className="text-yellow-700 mb-1 font-serif font-black text-sm">High Memory Usage Expected</h3>
              <p className="text-yellow-600 font-serif font-black text-xs">
                Large files or long target durations require significant memory. Processing may be slow or unstable on
                devices with limited RAM.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header with title and decorative elements */}
      <div className="relative text-center px-[69px]">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1
            className="text-5xl text-transparent bg-clip-text bg-gradient-to-r from-logo-amber via-logo-rose via-logo-purple to-logo-teal transform hover:scale-105 transition-transform duration-700 ease-out font-black md:text-6xl mb-0 tracking-tighter text-center mt-16"
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              textShadow: "0 0 25px rgba(139, 69, 69, 0.25)",
            }}
          >
            abhī
          </h1>
          <div className="font-black text-logo-rose-600 font-serif mb-[7px] text-xs">Meditation Tool</div>
          <div className="flex justify-center items-center mb-4 space-x-[3px]">
            <div className="bg-gradient-to-br from-logo-teal to-logo-emerald rounded-sm transform rotate-12 w-[13px] h-[13px]"></div>
            <div className="bg-gradient-to-br from-logo-rose to-pink-300 rounded-full h-[9px] w-[9px]"></div>
            <div className="w-4 bg-gradient-to-br from-logo-amber to-orange-300 rounded-sm transform -rotate-6 h-[9px]"></div>
            <div className="bg-gradient-to-r from-gray-600 to-gray-500 rounded-sm w-[48px] h-[4px]"></div>
            <div className="w-4 bg-gradient-to-br from-logo-purple to-indigo-300 rounded-sm transform rotate-6 h-[9px] pl-0 ml-2"></div>
            <div className="bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full h-[9px] w-[9px]"></div>
            <div className="bg-gradient-to-br from-logo-emerald to-logo-teal rounded-sm transform -rotate-12 w-[13px] h-[13px]"></div>
          </div>

          {/* Mode Switch */}
          <div className="flex justify-center items-center mb-4 space-y-4 flex-row my-[33px]">
            <div className="flex mx-auto items-center p-1 font-serif text-gray-600 shadow-inner rounded-sm gap-1 w-fit bg-muted">
              <button
                onClick={() => setActiveMode("adjuster")}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-black py-3 tracking-tight text-sm",
                  activeMode === "adjuster" ? "bg-white text-gray-600 shadow-sm " : "text-gray-600 ",
                )}
              >
                Adjuster
              </button>
              <button
                onClick={() => setActiveMode("encoder")}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 py-3 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-black text-gray-600 tracking-tight text-sm",
                  activeMode === "encoder" ? "bg-white text-gray-600 shadow-sm " : "text-gray-600 ",
                )}
              >
                Encoder
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Mode Description Notes */}
      <AnimatePresence mode="wait">
        {activeMode === "adjuster" && (
          <motion.div
            key="adjuster-note"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-4 rounded-md font-serif font-black max-w-2xl mx-auto border-solid text-logo-rose-600 border-logo-rose-500 border-0 shadow-none mb-4 py-0 px-0"
          >
            <p className="text-center px-4 pt-1.5 text-logo-rose-600 text-xs">
              Change the length of your guided meditations. Upload an audio file, set your target duration, and this
              tool will re-space content to fit your schedule.
            </p>
          </motion.div>
        )}
        {activeMode === "encoder" && (
          <motion.div
            key="encoder-note"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-4 rounded-md font-serif font-black max-w-2xl mx-auto border-solid text-logo-rose-600 border-logo-rose-500 border-0 shadow-none mb-4 py-0 px-0"
          >
            <p className="text-center px-4 pt-1.5 text-logo-rose-600 text-xs pb-1.5">
              Design custom guided meditations by pairing instructions with sound cues or using the recorder, then
              arranging events on the timeline.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conditional Rendering based on activeMode */}
      {activeMode === "adjuster" ? (
        // == Length Adjuster UI ==
        <>
          {/* Note and Resources sections */}
          <div className="space-y-4 mb-[27px]">
            <div className="p-4 max-w-2xl text-center mx-auto rounded-md border-logo-rose-500 border-0 shadow-none pt-0 pb-1">
              <p className="leading-relaxed font-serif font-black text-xs text-gray-600">
                <strong className="pr-1.5 font-black font-serif text-center text-sm text-logo-amber-400">Note:</strong>
                Depending on the audio, users may need to tweak the advanced settings for optimal results. Only pauses
                are adjusted, spoken instruction is preserved. Any guided meditation{" "}
                {"under " + (isMobileDevice ? "50MB" : "500MB") + ""} should be compatible. Teachers, please feel free
                to
                <a
                  href="/contact"
                  className=" underline px-1 rounded transition-colors transition-shadow font-black text-sm text-logo-purple-300"
                >
                  contact me
                </a>
                to opt out. Enjoy:)
              </p>
            </div>
            <div className="p-4 rounded-lg border-logo-rose-300 max-w-2xl mx-auto backdrop-blur-sm border-0 py-4 px-0 bg-transparent pt-0 pb-0">
              <h3 className="mb-2 text-center font-black px-0 rounded text-base text-gray-600 pb-0.5">Resources</h3>
              <div className="text-sm text-gray-600 leading-relaxed flex flex-wrap justify-center text-center gap-[5px] px-2">
                <a
                  href="https://dharmaseed.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-black text-gray-600 px-5 py-1 transition-all duration-200 ease-out hover:shadow-none shadow-md border-gray-500 text-xs border-[3px] rounded-sm"
                >
                  Dharma Seed
                </a>
                <a
                  href="https://dharmaseed.org/teacher/210/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-gray-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out px-5 font-black font-serif hover:shadow-none shadow-md border-gray-500 text-xs border-[3px] rounded-sm"
                >
                  Rob Burbea's talks & retreats
                </a>
                <a
                  href="https://tasshin.com/guided-meditations/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-gray-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out px-5 font-black font-serif hover:shadow-none shadow-md border-gray-500 text-xs border-[3px] rounded-sm"
                >
                  Tasshin & friend's meditations
                </a>
                <a
                  href="https://www.tarabrach.com/guided-meditations/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-gray-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out px-5 font-serif font-black hover:shadow-none shadow-md rounded-xlder-2 border-gray-500 text-xs border-[3px] rounded-sm"
                >
                  Tara Brach's meditations
                </a>
                <a
                  href="https://drive.google.com/drive/folders/1k4plsQfxTF_1BXffShz7w3P6q4IDDo3?usp=drive_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-gray-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out px-5 font-serif font-black hover:shadow-none shadow-md rounded-xlder-2 border-gray-500 text-xs border-[3px] rounded-sm"
                >
                  Toby Sola's meditations
                </a>
                <a
                  href="https://meditofoundation.org/meditations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-gray-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out px-5 font-serif font-black hover:shadow-none shadow-md rounded-xlder-2 border-gray-500 text-xs border-[3px] rounded-sm"
                >
                  Medito Foundation
                </a>
                <a
                  href="https://www.freebuddhistaudio.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-black text-gray-600 px-5 py-1 transition-all duration-200 ease-out hover:shadow-none shadow-md border-gray-500 text-xs border-[3px] rounded-sm"
                >
                  freebuddhistaudio
                </a>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <motion.div
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            ref={uploadAreaRef}
            className="overflow-hidden border-none bg-white rounded-2xl mb-5 cursor-pointer transition-all duration-300 shadow-none hover:shadow-md"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOverAction}
            onDragLeave={handleDragLeaveAction}
            onDrop={handleDropAction}
          >
            <div className="p-0.5 bg-gradient-to-r from-logo-teal-500 to-logo-purple-300 border-indigo-200 border-0 px-[5px] py-1 pl-1 pr-1 shadow-lg rounded-sm">
              <div className="p-10 md:p-16 text-center md:py-14 bg-white border-white border-0 rounded-sm">
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <div className="font-serif mb-2.5 font-black text-base text-gray-600">
                    Drop your audio file here or click to browse
                  </div>
                  <div className="font-serif text-xs text-gray-500">
                    Supports MP3, WAV, OGG, and M4A files {"(Max: " + (isMobileDevice ? "50MB" : "500MB") + ")"}
                  </div>
                </motion.div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".mp3,.wav,.ogg,.m4a,audio/*"
              onChange={handleFileSelectAction}
            />
          </motion.div>

          {/* File Display */}
          <AnimatePresence>
            {file && (
              <motion.div
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="p-0.5 mb-3.5 overflow-hidden bg-gradient-to-r from-logo-amber-300 to-logo-purple-300 py-1 px-[5px] shadow-md rounded-sm pr-1 pl-1"
              >
                <div className="bg-white p-5 py-4 rounded-sm">
                  <div className="flex items-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.1 }}
                      className="p-2 rounded-lg mr-4 bg-transparent text-purple-300"
                    >
                      <Volume2 className="h-4 w-4 text-gray-600" />
                    </motion.div>
                    <div className="flex-1">
                      <motion.div
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-1 font-black text-gray-600 text-xs"
                      >
                        {file.name}
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-1 font-black text-sm text-gray-500"
                      >
                        Size: {formatFileSize(file.size)}
                        {" • Type: "}
                        {file.type}
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Settings Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Tabs defaultValue="basic" className="w-full font-serif font-black">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted p-1 rounded-sm">
                <TabsTrigger
                  value="basic"
                  className="data-[state=active]:bg-white data-[state=active]:text-logo-teal-700 data-[state=active]:shadow-sm rounded-sm"
                >
                  Basic Settings
                </TabsTrigger>
                <TabsTrigger
                  value="advanced"
                  className="data-[state=active]:bg-white data-[state=active]:text-logo-teal-700 data-[state=active]:shadow-sm rounded-sm"
                >
                  Advanced Settings
                </TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="mt-0 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="overflow-hidden border-none shadow-lg bg-white">
                    <div className="bg-gradient-to-r from-logo-blue-400 to-logo-amber-300 py-3 px-6 text-cyan-500">
                      <h3 className="text-white flex items-center font-black text-base">Target Duration</h3>
                    </div>
                    <div className="p-6 py-6 px-11 pb-6">
                      <div className="mb-4">
                        <Slider
                          value={[targetDuration]}
                          min={durationLimits?.min || 5}
                          max={durationLimits?.max || (isMobileDevice ? 60 : 120)}
                          step={1}
                          onValueChange={(value) => setTargetDuration(value[0])}
                          disabled={!durationLimits}
                          className="py-4"
                          rangeClassName="bg-gradient-to-r from-logo-blue-400 to-logo-amber-300"
                        />
                      </div>
                      <div className="text-center font-serif font-black">
                        <span className="font-black text-xl text-gray-600">{targetDuration}</span>
                        <span className="ml-1 text-base text-gray-600">minutes</span>
                      </div>
                      {durationLimits && (
                        <div className="text-center text-sm mt-0 text-gray-500">
                          Range: {durationLimits.min} min to {isMobileDevice ? "1 hour" : "2 hours"}
                        </div>
                      )}
                    </div>
                  </Card>
                  <Card className="overflow-hidden border-none shadow-lg bg-white">
                    <div className="bg-gradient-to-r from-logo-rose-300 to-logo-emerald-500 py-3 px-6">
                      <h3 className="text-white flex items-center font-black text-base">Silence Threshold</h3>
                    </div>
                    <div className="p-6 px-11">
                      <div className="mb-4">
                        <Slider
                          value={[silenceThreshold]}
                          min={0.001}
                          max={0.05}
                          step={0.001}
                          onValueChange={(value) => setSilenceThreshold(value[0])}
                          className="py-4"
                          rangeClassName="bg-gradient-to-r from-logo-rose-300 to-logo-emerald-500"
                        />
                      </div>
                      <div className="text-center">
                        <span className="font-serif font-black text-xl text-gray-600">
                          {silenceThreshold.toFixed(3)}
                        </span>
                      </div>
                      <div className="text-center text-sm mt-0 text-gray-500">Lower = more sensitive</div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="advanced" className="mt-0 space-y-6">
                <div className="grid md:grid-cols-2 gap-6 font-serif font-black">
                  <Card className="overflow-hidden border-none shadow-lg bg-white">
                    <div className="bg-gradient-to-r from-logo-purple-300 to-logo-emerald-500 py-3 px-6">
                      <h3 className="text-white font-black">Min Silence Duration</h3>
                    </div>
                    <div className="p-6 font-serif font-black px-11 py-6">
                      <div className="mb-4">
                        <Slider
                          value={[minSilenceDuration]}
                          min={1}
                          max={15}
                          step={0.5}
                          onValueChange={(value) => setMinSilenceDuration(value[0])}
                          className="py-4"
                          rangeClassName="bg-gradient-to-r from-logo-purple-300 to-logo-emerald-500"
                        />
                      </div>
                      <div className="text-center">
                        <span className="font-black text-xl text-gray-600">{minSilenceDuration}</span>
                        <span className="ml-1 text-base text-gray-600">seconds</span>
                      </div>
                      <div className="text-center mt-0 text-sm text-gray-500">Shorter = detect more pauses</div>
                    </div>
                  </Card>
                  <Card className="overflow-hidden border-none shadow-lg bg-white">
                    <div className="bg-gradient-to-r from-orange-300 to-logo-rose-300 py-3 px-6">
                      <h3 className="text-white font-black">Min Spacing Between Content</h3>
                    </div>
                    <div className="p-6 px-11 py-6">
                      <div className="mb-4">
                        <Slider
                          value={[minSpacingDuration]}
                          min={0.0}
                          max={5}
                          step={0.1}
                          onValueChange={(value) => setMinSpacingDuration(value[0])}
                          className="py-4"
                          rangeClassName="bg-gradient-to-r from-orange-300 to-logo-rose-300"
                        />
                      </div>
                      <div className="text-center">
                        <span className="font-black text-xl text-gray-600">{minSpacingDuration.toFixed(1)}</span>
                        <span className="ml-1 text-base text-gray-600">seconds</span>
                      </div>
                      <div className="text-center text-sm mt-0 text-gray-500">Minimum pause between speaking parts</div>
                    </div>
                  </Card>
                  <Card className="overflow-hidden border-none shadow-lg bg-white">
                    <div className="bg-gradient-to-r from-pink-400 to-cyan-400 py-3 px-6">
                      <h3 className="text-white font-black">Preserve Natural Pacing</h3>
                    </div>
                    <div className="p-6 px-11 py-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="mb-1 text-gray-600 text-sm mr-2">Maintain the relative length of pauses</p>
                        </div>
                        <Switch
                          checked={preserveNaturalPacing}
                          onCheckedChange={setPreserveNaturalPacing}
                          className="data-[state=checked]:bg-gray-400"
                        />
                      </div>
                    </div>
                  </Card>
                  <Card className="overflow-hidden border-none shadow-lg bg-white">
                    <div className="bg-gradient-to-r from-logo-teal-500 to-logo-amber-300 py-3 px-6">
                      <h3 className="text-white font-black">Compatibility Mode</h3>
                    </div>
                    <div className="p-6 px-11">
                      <Select value={compatibilityMode} onValueChange={(value) => setCompatibilityMode(value)}>
                        <SelectTrigger className="w-full mb-2 border-logo-teal-200 focus:ring-logo-teal-500">
                          <SelectValue placeholder="Select compatibility mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard Quality (Original SR)</SelectItem>
                          <SelectItem value="high">
                            High Compatibility (44.1kHz or 22.05kHz for Mobile Long Audio)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs mt-3.5 text-gray-500">
                        High Compatibility for better playback on mobile/AirPods. May reduce sample rate for long audio
                        on mobile.
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Process Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6 text-center font-serif font-black text-base rounded-sm"
          >
            <Button
              className={cn(
                "w-full py-7 text-lg font-medium tracking-wider rounded-xl transition-all",
                "shadow-lg hover:shadow-none active:shadow-none text-white",
                "bg-gradient-to-r from-logo-purple-300 via-logo-teal-500 to-orange-300",
                "hover:brightness-[1.06] active:brightness-95",
              )}
              disabled={!originalBuffer || isProcessing || !durationLimits}
              onClick={processAudioAdjusterAction}
            >
              <div className="flex items-center justify-center">
                {isProcessing && (
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                )}
                <Wand2 className="mr-2 h-4 w-4 text-white" />
                <span className="font-black text-base text-white tracking-tight">
                  {isProcessing ? "Processing..." : "Process Audio"}
                </span>
              </div>
            </Button>
          </motion.div>

          {/* Results */}
          <div className="space-y-6 mt-6">
            {originalUrl && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-gray-50 to-muted">
                  <div className="bg-gradient-to-r from-gray-600 to-gray-500 py-3 px-6">
                    <h3 className="text-white font-black">Original Audio</h3>
                  </div>
                  <div className="p-6 py-4 px-3.5">
                    <div className="bg-white rounded-sm p-3 shadow-md mb-3.5 px-0">
                      <audio controls className="w-full" src={originalUrl}></audio>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 text-center shadow-md bg-white rounded-sm py-3.5">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Duration</div>
                        <div className="font-black text-gray-600 text-sm">
                          {originalBuffer ? formatTime(originalBuffer.duration) : "--"}
                        </div>
                      </div>
                      <div className="p-3 text-center shadow-md bg-white rounded-sm py-3.5">
                        <div className="text-xs uppercase tracking-wide mb-1 text-gray-500">File Size</div>
                        <div className="font-black text-gray-600 text-sm">{formatFileSize(file?.size || 0)}</div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
            {isProcessingComplete && processedUrl && (
              <Card className="p-6 bg-white shadow-lg border border-gray-200">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Processed Audio</h3>
                <div className="space-y-4">
                  <audio controls className="w-full" src={processedUrl} />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={downloadProcessedAudioAction}
                      className="flex-1 bg-gradient-to-r from-logo-teal-500 to-logo-blue-400 hover:from-logo-teal-600 hover:to-logo-blue-500 text-white"
                    >
                      Download Processed Audio
                    </Button>
                    <SaveMeditationDialog
                      audioUrl={processedUrl}
                      originalFileName={file?.name || "meditation"}
                      duration={actualDuration || targetDuration * 60}
                      source="adjuster"
                      metadata={{
                        targetDuration,
                        pausesAdjusted,
                      }}
                    >
                      <Button className="flex-1 bg-gradient-to-r from-logo-purple-500 to-logo-rose-400 hover:from-logo-purple-600 hover:to-logo-rose-500 text-white">
                        <BookmarkPlus className="w-4 h-4 mr-2" />
                        Save to Library
                      </Button>
                    </SaveMeditationDialog>
                  </div>
                  {actualDuration && (
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <strong>Actual Duration:</strong> {formatTime(actualDuration)}
                      </p>
                      <p>
                        <strong>Target Duration:</strong> {formatTime(targetDuration * 60)}
                      </p>
                      <p>
                        <strong>Pauses Adjusted:</strong> {pausesAdjusted}
                      </p>
                      <p>
                        <strong>File Size:</strong> {(processedFileSize / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </>
      ) : (
        // == Encoder UI ==
        <motion.div
          key="encoder-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <motion.div
            className="text-gray-600"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden bg-white max-w-2xl mx-auto rounded-2xl shadow-none">
              <div className="p-6 text-sm font-black py-0 bg-transparent shadow-none">
                <div className="grid md:grid-cols-2 gap-6 text-gray-600 pb-2">
                  <div className="text-center">
                    <Label htmlFor="meditation-title" className="text-gray-600 font-black">
                      Meditation Title
                    </Label>
                    <Input
                      id="meditation-title"
                      type="text"
                      value={meditationTitle}
                      onChange={handleMeditationTitleChange}
                      placeholder="My Custom Meditation"
                      className="mt-1 text-xs border-gray-500 focus-visible:border-gray-600 placeholder:text-gray-500 font-black text-gray-500 shadow-md"
                    />
                  </div>
                  <div className="text-center">
                    <Label htmlFor="encoder-duration" className="text-gray-600 font-black">
                      Duration (minutes)
                    </Label>
                    <Input
                      id="encoder-duration"
                      type="number"
                      value={encoderTotalDuration / 60}
                      onChange={handleDurationChange}
                      min="1"
                      className="mt-1 text-xs font-black border-gray-500 focus-visible:border-gray-600 text-gray-500 shadow-md"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-4"
          >
            <div className="flex flex-col gap-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="p-6 bg-transparent px-0 py-3 pb-0 pt-0"
              >
                <div className="p-0.5 bg-gradient-to-r from-logo-teal-500 to-logo-purple-300 border-indigo-200 border-0 px-[5px] py-1 pl-1 pr-1 shadow-lg rounded-sm">
                  <div className="bg-white p-4 border-rose-200 border-0 rounded-sm shadow-inner">
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
              <RecorderSection
                className="hidden lg:block"
                inputId="recording-label-desktop"
                recordingLabel={recordingLabel}
                onRecordingLabelChange={handleRecordingLabelChange}
                isRecording={isRecording}
                startRecording={startRecording}
                stopRecording={stopRecording}
                readyToAddToTimelineRecording={readyToAddToTimelineRecording}
                timelineEvents={timelineEvents}
                addEventToTimeline={addEventToTimeline}
                setReadyToAddToTimelineRecording={setReadyToAddToTimelineRecording}
                setRecordedBlobs={setRecordedBlobs}
                setRecordingLabel={setRecordingLabel}
                recordingPreviewRef={recordingPreviewRef}
              />
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="overflow-hidden border-none shadow-lg bg-white">
                <div className="bg-gradient-to-r from-logo-blue-400 to-logo-amber-300 py-3 px-6 text-center">
                  <h3 className="text-white flex items-center font-black text-left">
                    <Music2 className="h-4 w-4 mr-2" />
                    Sound Cues
                  </h3>
                </div>
                <div className="p-6 pt-[5px] flex flex-col space-y-4">
                  <div className="flex-1 h-auto">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="musical-notes">
                        <AccordionTrigger className="text-gray-600 hover:no-underline py-3 font-serif font-black">
                          <div className="flex items-center justify-between w-full">
                            <span>Notes</span>
                            <div className="flex flex-col gap-2 mr-6" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2 mb-[3px]">
                                <span className="text-xs text-gray-500">Type</span>
                                <select
                                  value={noteType}
                                  onChange={(e) => setNoteType(e.target.value as "piano" | "synth" | "harp")}
                                  className="text-xs bg-white border border-gray-300 rounded px-2 py-1"
                                >
                                  <option value="piano">Piano</option>
                                  <option value="synth">Synth</option>
                                  <option value="harp">Harp</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Multi-Note</span>
                                <button
                                  onClick={() => {
                                    setMultiNoteMode(!multiNoteMode)
                                    setSelectedNotes([])
                                  }}
                                  className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                                    multiNoteMode ? "bg-gray-500" : "bg-gray-200"
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                      multiNoteMode ? "translate-x-[1.125rem]" : "translate-x-0.5"
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          {multiNoteMode && (
                            <div className="p-3 bg-gray-50 rounded-sm mb-1.5 shadow-inner py-3 px-3">
                              <div className="flex items-center justify-between">
                                <div className="text-gray-500 text-sm">
                                  {selectedNotes.length > 0 ? selectedNotes.join(", ") : "None"}
                                </div>
                                {selectedNotes.length > 1 && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      console.log("[v0] Chord button clicked, selectedNotes:", selectedNotes)
                                      console.log("[v0] multiNoteMode:", multiNoteMode)
                                      playChordPreview()
                                    }}
                                    className="bg-gradient-to-r from-gray-600 to-gray-500 text-white font-serif font-black text-xs rounded-sm shadow-md"
                                  >
                                    Play Chord
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="text-center py-8 text-gray-500">
                            <div className="mb-2 text-lg font-black">Musical Notes Available</div>
                            <div className="text-sm">
                              Note selection interface would be implemented here with the MUSICAL_NOTES data.
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="miscellaneous">
                        <AccordionTrigger className="text-gray-600 hover:no-underline py-3 font-serif font-black">
                          Miscellaneous
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="text-center py-8 text-gray-500">
                            <div className="mb-2 text-lg font-black">Coming Soon!</div>
                            <div className="text-sm">
                              Additional sound cues are being developed and will be available in a future update.
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                  <div className="h-[11px]"></div>
                  <Button
                    className="bg-gradient-to-r from-logo-blue-400 to-logo-amber-300 shadow-md text-white rounded-sm hover:shadow-none font-serif font-black mt-4"
                    onClick={handleAddInstructionSoundEvent}
                    disabled={!customInstructionText.trim() || (!selectedSoundCue && selectedNotes.length === 0)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span className="font-black font-serif">Add to Timeline</span>
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>

          <RecorderSection
            className="lg:hidden"
            inputId="recording-label-mobile"
            recordingLabel={recordingLabel}
            onRecordingLabelChange={handleRecordingLabelChange}
            isRecording={isRecording}
            startRecording={startRecording}
            stopRecording={stopRecording}
            readyToAddToTimelineRecording={readyToAddToTimelineRecording}
            timelineEvents={timelineEvents}
            addEventToTimeline={addEventToTimeline}
            setReadyToAddToTimelineRecording={setReadyToAddToTimelineRecording}
            setRecordedBlobs={setRecordedBlobs}
            setRecordingLabel={setRecordingLabel}
            recordingPreviewRef={recordingPreviewRef}
          />

          {/* Timeline Editor */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="overflow-hidden border-none shadow-lg bg-white">
              <div className="bg-gradient-to-r from-gray-600 to-gray-500 px-6 py-3">
                <h3 className="text-white flex items-center font-black text-base">
                  <CircleDotDashed className="h-5 w-5 mr-2" />
                  Timeline Editor
                </h3>
              </div>
              <div className="p-6 px-7">
                <VisualTimeline
                  events={timelineEvents}
                  totalDuration={encoderTotalDuration}
                  onUpdateEvent={updateEventStartTime}
                  onRemoveEvent={removeTimelineEvent}
                  onDuplicateEvent={handleDuplicateEvent}
                  selectedInstrument={noteType}
                  playSingleNote={timelinePlaySingleNote}
                  playChordPreview={timelinePlayChordPreview}
                />
              </div>
            </Card>
          </motion.div>

          {/* Generate Audio Button */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Button
              onClick={handleExportAudio}
              disabled={isGeneratingAudio || timelineEvents.length === 0}
              className={cn(
                "w-full py-7 text-lg font-medium tracking-wider rounded-sm transition-all",
                "shadow-lg hover:shadow-none active:shadow-none text-white",
                "bg-gradient-to-r from-logo-purple-300 via-logo-teal-500 to-orange-300",
                "hover:brightness-[1.06] active:brightness-95",
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                )}
                <Mic className="mr-2 h-4 w-4" />
                <span className="font-black tracking-tight text-base">
                  {isGeneratingAudio ? "Generating..." : "Generate Audio"}
                </span>
              </div>
            </Button>
          </motion.div>

          {/* Generated Audio Results */}
          {generatedAudioUrl && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-gray-50 to-muted">
                <div className="bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 py-3 px-6">
                  <h3 className="text-white font-black">Generated Audio</h3>
                </div>
                <div className="p-6 px-3.5 py-4">
                  <div className="bg-white p-3 rounded-sm shadow-md mb-3.5 px-0">
                    <audio ref={encoderAudioRef} controls className="w-full" src={generatedAudioUrl}></audio>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3.5">
                    <div className="p-3 rounded-lg text-center bg-white shadow-md py-3.5">
                      <div className="text-xs uppercase tracking-wide mb-1 text-gray-500">Duration</div>
                      <div className="font-black text-gray-600 text-sm">{formatTime(encoderTotalDuration)}</div>
                    </div>
                    <div className="p-3 rounded-lg text-center bg-white shadow-md py-3.5">
                      <div className="text-xs uppercase tracking-wide mb-1 text-gray-500">File Size</div>
                      <div className="font-black text-sm text-gray-600">
                        {formatFileSize(generatedAudioFileSize || 0)}
                      </div>
                    </div>
                  </div>
                  <Button
                    className="w-full py-4 rounded-xl shadow-md bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 hover:shadow-none transition-shadow border-none"
                    onClick={() => {
                      if (generatedAudioUrl) {
                        const a = document.createElement("a")
                        a.href = generatedAudioUrl
                        a.download = `${meditationTitle.replace(/\s/g, "_") || "meditation"}.wav`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                      }
                    }}
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Download
                  </Button>
                  <SaveMeditationDialog
                    audioUrl={generatedAudioUrl}
                    originalFileName={meditationTitle || "meditation"}
                    duration={encoderTotalDuration}
                    source="encoder"
                    metadata={{
                      instructionCount: timelineEvents.length,
                      meditationTitle,
                    }}
                  >
                    <Button className="w-full py-4 rounded-xl shadow-md bg-gradient-to-r from-logo-purple-500 to-logo-rose-400 hover:from-logo-purple-600 hover:to-logo-rose-500 text-white mt-3">
                      <BookmarkPlus className="w-4 h-4 mr-2" />
                      Save to Library
                    </Button>
                  </SaveMeditationDialog>
                </div>
              </Card>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  )

  const LibraryContent = () => {
    const filteredMeditations = meditations.filter(
      (med) =>
        med.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        med.originalFileName.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    const displayedMeditations = selectedPlaylist
      ? MeditationLibrary.getPlaylistMeditations(selectedPlaylist)
      : filteredMeditations

    const formatDuration = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date)
    }

    return (
      <div className="px-6 md:px-10 pb-10">
        {/* Custom underline matching home page but larger */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="flex justify-center items-center space-x-[4px]">
              <div className="bg-gradient-to-br from-logo-teal to-logo-emerald rounded-sm transform rotate-12 w-[16px] h-[16px]"></div>
              <div className="bg-gradient-to-br from-logo-rose to-pink-300 rounded-full h-[11px] w-[11px]"></div>
              <div className="w-5 bg-gradient-to-br from-logo-amber to-orange-300 rounded-sm transform -rotate-6 h-[11px]"></div>
              <div className="bg-gradient-to-r from-gray-600 to-gray-500 px-0 mx-0 rounded-sm w-[64px] text-logo-rose-600 border-0 bg-gray-600 h-[6px]"></div>
              <div className="w-5 bg-gradient-to-br from-logo-purple to-indigo-300 rounded-sm transform rotate-6 h-[11px] pl-0 ml-2"></div>
              <div className="bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full h-[11px] w-[11px]"></div>
              <div className="bg-gradient-to-br from-logo-emerald to-logo-teal rounded-sm transform -rotate-12 w-[16px] h-[16px]"></div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="flex p-1 bg-muted rounded-lg">
            <button
              onClick={() => setActiveTab("meditations")}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                activeTab === "meditations" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Meditations ({meditations.length})
            </button>
            <button
              onClick={() => setActiveTab("playlists")}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                activeTab === "playlists" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Playlists ({playlists.length})
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "meditations" && (
            <motion.div
              key="meditations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {displayedMeditations.length === 0 ? (
                <Card className="p-12 text-center">
                  <Music className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No meditations saved yet</h3>
                  <p className="text-gray-500 mb-4">
                    Create your first meditation using the Adjuster or Encoder tools.
                  </p>
                  <Button onClick={() => setActivePage("home")}>Go to Tools</Button>
                </Card>
              ) : (
                <div className="text-center">
                  <p className="text-gray-600">Your meditation library will appear here.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const ContactContent = () => (
    <div className="px-6 md:px-10 pb-10">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-gray-800 mb-4 font-serif">Contact</h2>
        <p className="text-gray-600 mb-8">Get in touch with us</p>
      </div>
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <div className="space-y-6">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Your name" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="your@email.com" />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="Your message" rows={5} />
            </div>
            <Button className="w-full">Send Message</Button>
          </div>
        </Card>
      </div>
    </div>
  )

  const DonateContent = () => (
    <div className="px-6 md:px-10 pb-10">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-gray-800 mb-4 font-serif">Support abhī</h2>
        <p className="text-gray-600 mb-8">Help us continue developing meditation tools</p>
      </div>
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <h3 className="text-xl font-semibold mb-4">Make a Donation</h3>
          <p className="text-gray-600 mb-6">Your support helps us maintain and improve abhī for everyone.</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Button variant="outline">$5</Button>
            <Button variant="outline">$15</Button>
            <Button variant="outline">$25</Button>
          </div>
          <Button className="w-full">Donate Now</Button>
        </Card>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-muted p-4 md:p-8 md:pt-[3px]">
      <Navigation />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden transition-colors duration-300 ease-in-out"
        style={{
          borderRadius: "4rem 3rem 2rem 1rem",
        }}
        role="application"
      >
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20"></div>
            <div className="absolute top-2 left-8 w-16 h-12 bg-gradient-to-br from-emerald-300/30 to-teal-400/25 rounded-full transform rotate-12"></div>
            <div className="absolute top-6 right-12 w-20 h-8 bg-gradient-to-bl from-rose-300/25 to-purple-400/20 rounded-full transform -rotate-6"></div>
            <div className="absolute top-1 left-1/3 w-12 h-16 bg-gradient-to-tr from-amber-300/20 to-orange-400/15 rounded-full transform rotate-45"></div>
            <div className="absolute top-8 right-1/4 w-14 h-10 bg-gradient-to-tl from-blue-300/25 to-indigo-400/20 rounded-full transform -rotate-12"></div>
          </div>
          <div className="relative">
            <AnimatePresence mode="wait">
              {activePage === "home" && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <HomeContent />
                </motion.div>
              )}
              {activePage === "library" && (
                <motion.div
                  key="library"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <LibraryContent />
                </motion.div>
              )}
              {activePage === "contact" && (
                <motion.div
                  key="contact"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <ContactContent />
                </motion.div>
              )}
              {activePage === "donate" && (
                <motion.div
                  key="donate"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <DonateContent />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

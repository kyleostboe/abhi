"use client"

import type React from "react"
import { useState, useRef } from "react"
import { AlertTriangle } from "lucide-react" // Import Copy icon
import { motion } from "framer-motion"
import { Navigation } from "@/components/navigation"
import { INSTRUCTIONS_LIBRARY } from "@/lib/meditation-data"
import type { Instruction, SoundCue, TimelineEvent } from "@/lib/types" // Import types
import { useMobile } from "@/hooks/use-mobile" // Import useMobile hook

interface TimelineItem {
  id: string
  type: "instruction" | "sound"
  duration: number // in seconds
  content: Instruction | SoundCue
}

export default function HomePage() {
  // State for mode toggle (Length Adjuster vs Labs)
  const [activeMode, setActiveMode] = useState<"adjuster" | "labs">("adjuster")

  // == States for Length Adjuster ==
  const [file, setFile] = useState<File | null>(null)
  const [originalBuffer, setOriginalBuffer] = useState<AudioBuffer | null>(null)
  const [processedBufferState, setProcessedBufferState] = useState<AudioBuffer | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null) // Still needed for Adjuster's specific context management
  const [targetDuration, setTargetDuration] = useState<number>(20)
  const [silenceThreshold, setSilenceThreshold] = useState<number>(0.01)
  const [minSilenceDuration, setMinSilenceDuration] = useState<number>(3)
  const [minSpacingDuration, setMinSpacingDuration] = useState<number>(1.5)
  const [preserveNaturalPacing, setPreserveNaturalPacing] = useState<boolean>(true)
  const [compatibilityMode, setCompatibilityMode] = useState<string>("high")
  const [status, setStatus] = useState<{ message: string; type: string } | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string>("")
  const [processedUrl, setProcessedUrl] = useState<string>("")
  const [pausesAdjusted, setPausesAdjusted] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState<boolean>(false) // Corrected type to boolean
  const [processingProgress, setProcessingProgress] = useState<number>(0)
  const [processingStep, setProcessingStep] = useState<string>("")
  const [durationLimits, setDurationLimits] = useState<{ min: number; max: number } | null>(null)
  const [audioAnalysis, setAudioAnalysis] = useState<{
    totalSilence: number
    contentDuration: number
    silenceRegions: number
  } | null>(null)
  const [actualDuration, setActualDuration] = useState<number | null>(null)
  const [isProcessingComplete, setIsProcessingComplete] = useState<boolean>(false)
  const isMobileDevice = useMobile() // Use the useMobile hook
  const [memoryWarning, setMemoryWarning] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Add these new state variables and ref at the top of the HomePage component, near other state declarations:
  const backgroundAudioRef = useRef<HTMLAudioElement | AudioBufferSourceNode | null>(null) // Can be HTMLAudioElement or AudioBufferSourceNode
  const [currentPlayingBackgroundSoundId, setCurrentPlayingBackgroundSoundId] = useState<string | null>(null)

  // == States for Labs ==
  const [meditationTitle, setMeditationTitle] = useState<string>("My Custom Meditation")
  const [labsTotalDuration, setLabsTotalDuration] = useState<number>(600)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [selectedLibraryInstruction, setSelectedLibraryInstruction] = useState<Instruction | null>(null)
  const [customInstructionText, setCustomInstructionText] = useState<string>("")
  const [selectedSoundCue, setSelectedSoundCue] = useState<SoundCue | null>(null)
  const [isRecording, setIsRecording] = useState<boolean>(false)
  // State to hold the recorded audio data ready for adding to timeline
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

  // Update the type definition for backgroundSounds to remove the redundant 'enabled' property:
  const [backgroundSounds, setBackgroundSounds] = useState<
    Array<{
      id: string
      name: string
      src: string // File path or synthetic: prefix for export
      volume: number
    }>
  >([])
  const [masterBackgroundVolume, setMasterBackgroundVolume] = useState<number>(0.5)

  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [currentTab, setCurrentTab] = useState<string>("instructions")
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0) // in seconds
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null)
  const [volume, setVolume] = useState<number>(75) // Default volume 75%
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentItemStartTimeRef = useRef<number>(0)

  const totalDuration = timeline.reduce((sum, item) => sum + item.duration, 0)

  const handleFileSelectAction = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) handleFile(selectedFile)
    if (e.target) e.target.value = ""
  }

  const handleFile = async (selectedFile: File) => {
    console.log("handleFile called with:", selectedFile)
    // File handling logic here
  }

  const handleDragOverAction = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploadAreaRef.current) uploadAreaRef.current.classList.add("border-primary")
  }

  const handleDragLeaveAction = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploadAreaRef.current) uploadAreaRef.current.classList.remove("border-primary")
  }

  const handleDropAction = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploadAreaRef.current) uploadAreaRef.current.classList.remove("border-primary")
    const files = e.dataTransfer.files
    if (files.length > 0) handleFile(files[0])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
      <Navigation />

      {memoryWarning && activeMode === "adjuster" && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-yellow-100 to-amber-50 border border-yellow-300 shadow-sm dark:shadow-white/10 dark:from-yellow-950 dark:to-amber-900 dark:border-yellow-700">
          <div className="flex items-start">
            <AlertTriangle className="text-yellow-500 mr-3 flex-shrink-0 mt-0.5 w-5 h-5" />
            <div>
              <h3 className="text-yellow-700 dark:text-yellow-300 mb-1 font-serif font-black text-sm">
                High Memory Usage Expected
              </h3>
              <p className="text-yellow-600 dark:text-yellow-400 font-serif font-black text-xs">
                Large files or long target durations require significant memory. Processing may be slow or unstable on
                devices with limited RAM.
              </p>
            </div>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-white/40 overflow-hidden dark:bg-gray-900/80 transition-colors duration-300 ease-in-out"
        style={{
          borderRadius: "4rem 3rem 2rem 1rem",
        }}
        role="application"
      >
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20 dark:from-amber-600/20 dark:via-rose-500/15 dark:via-purple-600/10 dark:to-teal-500/20"></div>
          </div>
          <div className="relative text-center px-[69px]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1 className="text-5xl text-transparent bg-clip-text bg-gradient-to-r from-logo-amber via-logo-rose via-logo-purple to-logo-teal dark:from-logo-amber dark:via-logo-rose dark:via-logo-purple dark:to-logo-teal transform hover:scale-105 transition-transform duration-700 ease-out font-black md:text-6xl mb-0 tracking-tighter text-center mt-16">
                abhī
              </h1>
              <div className="font-black text-logo-rose-600 font-serif mb-[7px] text-xs">Meditation Tool</div>
            </motion.div>
          </div>

          <div className="px-6 md:px-10 font-serif font-black pb-7">
            {activeMode === "adjuster" ? (
              <>
                {/* Upload Area */}
                <motion.div
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.995 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  ref={uploadAreaRef}
                  className="overflow-hidden border-none bg-white dark:bg-gray-900 rounded-2xl mb-5 cursor-pointer transition-all duration-300 shadow-none hover:shadow-md dark:shadow-white/10 dark:hover:shadow-white/20"
                  onClick={() => {
                    console.log("Upload area clicked, fileInputRef:", fileInputRef.current)
                    fileInputRef.current?.click()
                  }}
                  onDragOver={handleDragOverAction}
                  onDragLeave={handleDragLeaveAction}
                  onDrop={handleDropAction}
                >
                  <div className="p-0.5 bg-gradient-to-r from-logo-teal-500 to-logo-purple-300 dark:shadow-white/20 px-[5px] py-1 shadow-sm rounded-sm pl-1">
                    <div className="p-10 md:p-16 text-center md:py-14 bg-white dark:bg-gray-900 border-white border-0 rounded-sm">
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="dark:text-gray-200 font-serif mb-2.5 font-black text-base text-gray-600">
                          Drop your audio file here or click to browse
                        </div>
                        <div className="dark:text-gray-400/70 font-serif text-xs text-gray-500">
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
                    onChange={(e) => {
                      console.log("File input changed, files:", e.target.files)
                      handleFileSelectAction(e)
                    }}
                  />
                </motion.div>
              </>
            ) : (
              <div>Labs content here</div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

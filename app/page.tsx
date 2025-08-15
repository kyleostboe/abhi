"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PlusCircle } from "lucide-react"
import { motion } from "framer-motion"
import { Navigation } from "@/components/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { INSTRUCTIONS_LIBRARY } from "@/lib/meditation-data"
import type { TimelineEvent } from "@/lib/types"
import { useMobile } from "@/hooks/use-mobile"

export default function Home() {
  const [mode, setMode] = useState<"adjuster" | "encoder">("adjuster")
  const [file, setFile] = useState<File | null>(null)
  const [processedUrl, setProcessedUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [targetDuration, setTargetDuration] = useState<number>(300)
  const [silenceThreshold, setSilenceThreshold] = useState<number>(0.01)
  const [minSilenceDuration, setMinSilenceDuration] = useState<number>(0.5)
  const [minSpacingBetweenContent, setMinSpacingBetweenContent] = useState<number>(0.2)
  const [preserveNaturalPacing, setPreserveNaturalPacing] = useState<boolean>(true)
  const [compatibilityMode, setCompatibilityMode] = useState<"standard" | "high">("standard")
  const [audioAnalysis, setAudioAnalysis] = useState<{
    totalSilence: number
    contentDuration: number
    silenceRegions: number
  } | null>(null)
  const [actualDuration, setActualDuration] = useState<number | null>(null)
  const [isProcessingComplete, setIsProcessingComplete] = useState<boolean>(false)
  const [processedFileSize, setProcessedFileSize] = useState<number>(0)
  const isMobileDevice = useMobile()
  const [memoryWarning, setMemoryWarning] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Encoder state
  const [meditationTitle, setMeditationTitle] = useState<string>("")
  const [meditationDuration, setMeditationDuration] = useState<number>(300)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [recordingDuration, setRecordingDuration] = useState<number>(0)
  const [readyToAddToTimelineRecording, setReadyToAddToTimelineRecording] = useState<{
    url: string
    duration: number
    label: string
  } | null>(null)
  const [recordedBlobs, setRecordedBlobs] = useState<Blob[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const encoderAudioRef = useRef<HTMLAudioElement | null>(null)
  const instructionCategories = Array.from(new Set(INSTRUCTIONS_LIBRARY.map((instr) => instr.category)))
  const [recordingLabel, setRecordingLabel] = useState<string>("")
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false)
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null)
  const [encoderTotalDuration, setEncoderTotalDuration] = useState<number>(0)

  // Basic functions
  const handleFile = (selectedFile: File) => {
    setFile(selectedFile)
    setProcessedUrl(null)
    setAudioAnalysis(null)
    setActualDuration(null)
    setIsProcessingComplete(false)
    setProcessedFileSize(0)
  }

  const handleFileSelectAction = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      handleFile(selectedFile)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <Navigation />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8"
      >
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-black mb-2 bg-gradient-to-r from-logo-rose-400 to-logo-rose-600 bg-clip-text text-transparent"
          >
            abhī
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-logo-rose-500 font-bold mb-4"
          >
            Meditation Tool
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex justify-center items-center space-x-2 mb-8"
          >
            <div className="w-3 h-3 rounded-full bg-logo-emerald-400"></div>
            <div className="w-3 h-3 rounded-full bg-logo-rose-400"></div>
            <div className="w-3 h-3 rounded-full bg-logo-amber-400"></div>
            <div className="w-8 h-3 rounded-full bg-gray-600"></div>
            <div className="w-3 h-3 rounded-full bg-logo-purple-400"></div>
            <div className="w-3 h-3 rounded-full bg-logo-blue-400"></div>
            <div className="w-3 h-3 rounded-full bg-logo-emerald-400"></div>
          </motion.div>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg">
              <div className="flex">
                <Button
                  variant={mode === "adjuster" ? "default" : "ghost"}
                  onClick={() => setMode("adjuster")}
                  className="rounded-full px-6 py-2 font-semibold transition-all duration-200"
                >
                  Adjuster
                </Button>
                <Button
                  variant={mode === "encoder" ? "default" : "ghost"}
                  onClick={() => setMode("encoder")}
                  className="rounded-full px-6 py-2 font-semibold transition-all duration-200"
                >
                  Encoder
                </Button>
              </div>
            </div>
          </div>

          {mode === "adjuster" && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <Card className="p-6 mb-6">
                <h2 className="text-2xl font-bold mb-4 text-center">Audio Adjuster</h2>
                <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
                  Change the length of guided meditations by adjusting silence periods. Upload an audio file, set your
                  target duration, and this tool will re-space content to fit your schedule.
                </p>

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelectAction}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <Button onClick={() => fileInputRef.current?.click()} className="mb-4">
                    <PlusCircle className="mr-2 w-4 h-4" />
                    Upload Audio File
                  </Button>
                  {file && <p className="text-sm text-gray-600 dark:text-gray-300">Selected: {file.name}</p>}
                </div>
              </Card>
            </motion.div>
          )}

          {mode === "encoder" && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <Card className="p-6 mb-6">
                <h2 className="text-2xl font-bold mb-4 text-center">Meditation Encoder</h2>
                <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
                  Create custom meditations by associating instructions with sound cues and placing them on a timeline.
                  Record your voice, add background sounds, and generate your final audio.
                </p>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="meditation-title">Meditation Title</Label>
                    <Input
                      id="meditation-title"
                      value={meditationTitle}
                      onChange={(e) => setMeditationTitle(e.target.value)}
                      placeholder="Enter meditation title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="meditation-duration">Duration (seconds)</Label>
                    <Input
                      id="meditation-duration"
                      type="number"
                      value={meditationDuration}
                      onChange={(e) => setMeditationDuration(Number(e.target.value))}
                      min="60"
                      max="3600"
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

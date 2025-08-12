"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Upload, Download, Clock, Zap, Timer, BracketsIcon as Spacing } from "lucide-react"
import { cn } from "@/lib/utils"

const formatTime = (duration) => {
  const minutes = Math.floor(duration / 60)
  const seconds = Math.floor(duration % 60)
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

const formatFileSize = (size) => {
  if (size === 0) return "--"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(size) / Math.log(k))
  return `${Number.parseFloat((size / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export default function Page() {
  // Mode state
  const [mode, setMode] = useState("adjuster")

  // File handling
  const [selectedFile, setSelectedFile] = useState(null)
  const [audioUrl, setAudioUrl] = useState("")
  const [processedUrl, setProcessedUrl] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef(null)

  // Audio analysis
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioFileSize, setAudioFileSize] = useState(0)
  const [silenceDetected, setSilenceDetected] = useState(0)
  const [contentDuration, setContentDuration] = useState(0)

  // Settings
  const [targetDuration, setTargetDuration] = useState(600) // 10 minutes
  const [silenceThreshold, setSilenceThreshold] = useState(-40)
  const [minSilenceDuration, setMinSilenceDuration] = useState(0.5)
  const [minSpacing, setMinSpacing] = useState(1.0)
  const [preserveNaturalPacing, setPreserveNaturalPacing] = useState(true)
  const [compatibilityMode, setCompatibilityMode] = useState(false)

  // Encoder mode states
  const [meditationTitle, setMeditationTitle] = useState("")
  const [meditationDuration, setMeditationDuration] = useState(600)
  const [timelineEvents, setTimelineEvents] = useState([])
  const [backgroundSounds, setBackgroundSounds] = useState([])
  const [masterBackgroundVolume, setMasterBackgroundVolume] = useState(0.5)
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState("")
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)

  const handleFile = useCallback((file) => {
    if (file && file.type.startsWith("audio/")) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setAudioUrl(url)
      setAudioFileSize(file.size)

      // Create audio element to get duration
      const audio = new Audio(url)
      audio.addEventListener("loadedmetadata", () => {
        setAudioDuration(audio.duration)
      })
    }
  }, [])

  const handleFileSelectAction = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile],
  )

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
  }, [])

  const processAudio = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    // Simulate processing
    setTimeout(() => {
      setProcessedUrl(audioUrl) // For demo, use same URL
      setIsProcessing(false)
      setSilenceDetected(120) // Demo values
      setContentDuration(audioDuration - 120)
    }, 3000)
  }

  const handleExportAudio = () => {
    setIsGeneratingAudio(true)
    // Simulate audio generation
    setTimeout(() => {
      setGeneratedAudioUrl(audioUrl || "/placeholder-audio.mp3")
      setIsGeneratingAudio(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Mode Toggle */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-gray-800 dark:text-white mb-4">abhī</h1>
          <div className="flex items-center justify-center space-x-4">
            <span className={cn("text-sm font-medium", mode === "adjuster" ? "text-logo-teal-600" : "text-gray-500")}>
              Adjuster
            </span>
            <Switch
              checked={mode === "encoder"}
              onCheckedChange={(checked) => setMode(checked ? "encoder" : "adjuster")}
              className="data-[state=checked]:bg-logo-purple-500"
            />
            <span className={cn("text-sm font-medium", mode === "encoder" ? "text-logo-purple-600" : "text-gray-500")}>
              Encoder
            </span>
          </div>
        </div>

        {mode === "adjuster" ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* File Upload */}
            <Card className="overflow-hidden border-none shadow-xl dark:shadow-white/25 bg-gradient-to-br from-logo-teal-50 to-logo-emerald-50 dark:from-logo-teal-950 dark:to-logo-emerald-950">
              <div className="bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 py-3 px-6 dark:from-logo-teal-700 dark:to-logo-emerald-700">
                <h3 className="text-white font-black">Upload Audio</h3>
              </div>
              <div className="p-6">
                <div
                  className="border-dashed border-[3px] border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-logo-teal-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelectAction}
                    className="hidden"
                  />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                    {selectedFile ? selectedFile.name : "Drop your audio file here or click to browse"}
                  </p>
                  <p className="text-sm text-gray-500">Supports MP3, WAV, M4A, and other audio formats</p>
                </div>
              </div>
            </Card>

            {/* Settings Cards */}
            {selectedFile && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Target Duration */}
                <Card className="overflow-hidden border-none shadow-xl dark:shadow-white/25 bg-gradient-to-br from-logo-blue-50 to-logo-amber-50 dark:from-logo-blue-950 dark:to-logo-amber-950">
                  <div className="bg-gradient-to-r from-logo-blue-400 to-logo-amber-300 py-3 px-6 dark:from-logo-teal-700 dark:to-indigo-700">
                    <h3 className="text-white font-black flex items-center">
                      <Clock className="mr-2 h-4 w-4" />
                      Target Duration
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <Slider
                        value={[targetDuration]}
                        min={60}
                        max={3600}
                        step={30}
                        onValueChange={(value) => setTargetDuration(value[0])}
                        className="w-full"
                        rangeClassName="bg-gradient-to-r from-logo-blue-400 to-logo-amber-300 dark:from-logo-teal-700 dark:to-indigo-700"
                      />
                      <div className="text-center">
                        <span className="text-2xl font-black text-gray-700 dark:text-gray-300">
                          {formatTime(targetDuration)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Silence Threshold */}
                <Card className="overflow-hidden border-none shadow-xl dark:shadow-white/25 bg-gradient-to-br from-logo-rose-50 to-logo-emerald-50 dark:from-logo-rose-950 dark:to-logo-emerald-950">
                  <div className="bg-gradient-to-r from-logo-rose-300 to-logo-emerald-500 py-3 px-6 dark:from-indigo-700 dark:to-logo-teal-700">
                    <h3 className="text-white font-black flex items-center">
                      <Zap className="mr-2 h-4 w-4" />
                      Silence Threshold
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <Slider
                        value={[silenceThreshold]}
                        min={-60}
                        max={-10}
                        step={1}
                        onValueChange={(value) => setSilenceThreshold(value[0])}
                        className="w-full"
                        rangeClassName="bg-gradient-to-r from-logo-rose-300 to-logo-emerald-500 dark:from-indigo-700 dark:to-logo-teal-700"
                      />
                      <div className="text-center">
                        <span className="text-2xl font-black text-gray-700 dark:text-gray-300">
                          {silenceThreshold} dB
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Min Silence Duration */}
                <Card className="overflow-hidden border-none shadow-xl dark:shadow-white/25 bg-gradient-to-br from-logo-purple-50 to-logo-emerald-50 dark:from-logo-purple-950 dark:to-logo-emerald-950">
                  <div className="bg-gradient-to-r from-logo-purple-300 to-logo-emerald-500 py-3 px-6 dark:from-logo-amber-700 dark:to-logo-rose-700">
                    <h3 className="text-white font-black flex items-center">
                      <Timer className="mr-2 h-4 w-4" />
                      Min Silence Duration
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <Slider
                        value={[minSilenceDuration]}
                        min={0.1}
                        max={5.0}
                        step={0.1}
                        onValueChange={(value) => setMinSilenceDuration(value[0])}
                        className="w-full"
                        rangeClassName="bg-gradient-to-r from-logo-purple-300 to-logo-emerald-500 dark:from-logo-amber-700 dark:to-logo-rose-700"
                      />
                      <div className="text-center">
                        <span className="text-2xl font-black text-gray-700 dark:text-gray-300">
                          {minSilenceDuration.toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Min Spacing */}
                <Card className="overflow-hidden border-none shadow-xl dark:shadow-white/25 bg-gradient-to-br from-orange-50 to-pink-50 dark:from-orange-950 dark:to-pink-950">
                  <div className="bg-gradient-to-r from-orange-300 to-pink-400 py-3 px-6 dark:from-logo-purple-700 dark:to-logo-teal-700">
                    <h3 className="text-white font-black flex items-center">
                      <Spacing className="mr-2 h-4 w-4" />
                      Min Spacing Between Content
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <Slider
                        value={[minSpacing]}
                        min={0.1}
                        max={10.0}
                        step={0.1}
                        onValueChange={(value) => setMinSpacing(value[0])}
                        className="w-full"
                        rangeClassName="bg-gradient-to-r from-orange-300 to-pink-400 dark:from-logo-purple-700 dark:to-logo-teal-700"
                      />
                      <div className="text-center">
                        <span className="text-2xl font-black text-gray-700 dark:text-gray-300">
                          {minSpacing.toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Process Button */}
            {selectedFile && (
              <Button
                onClick={processAudio}
                disabled={isProcessing}
                className="w-full py-6 text-lg font-black bg-gradient-to-r from-logo-teal-500 via-logo-blue-400 via-logo-amber-400 to-pink-300 hover:brightness-110 text-white shadow-lg"
              >
                {isProcessing ? "Processing..." : "Process Audio"}
              </Button>
            )}

            {/* Processed Audio */}
            {processedUrl && (
              <Card className="overflow-hidden border-none shadow-xl dark:shadow-white/25 bg-gradient-to-br from-logo-teal-50 to-logo-emerald-50 dark:from-logo-teal-950 dark:to-logo-emerald-950">
                <div className="bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 py-3 px-6 dark:from-logo-teal-700 dark:to-logo-emerald-700">
                  <h3 className="text-white font-black">Adjusted Audio</h3>
                </div>
                <div className="p-6">
                  <div className="bg-white p-3 dark:shadow-white/10 mb-4 dark:bg-gray-700 shadow-md hover:shadow-none transition-shadow rounded-sm">
                    <audio controls className="w-full" src={processedUrl}></audio>
                  </div>
                  <Button
                    className="w-full py-4 bg-gradient-to-r from-logo-teal-600 to-logo-emerald-600 hover:from-logo-teal-700 hover:to-logo-emerald-700 text-white font-black"
                    onClick={() => {
                      const a = document.createElement("a")
                      a.href = processedUrl
                      a.download = "adjusted-audio.wav"
                      a.click()
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Adjusted Audio
                  </Button>
                </div>
              </Card>
            )}
          </div>
        ) : (
          /* Encoder Mode */
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Meditation Setup */}
            <Card className="overflow-hidden border-none shadow-xl dark:shadow-white/25 bg-gradient-to-br from-logo-purple-50 to-logo-teal-50 dark:from-logo-purple-950 dark:to-logo-teal-950">
              <div className="bg-gradient-to-r from-logo-purple-500 to-logo-teal-500 py-3 px-6 dark:from-logo-purple-700 dark:to-logo-teal-700">
                <h3 className="text-white font-black">Meditation Setup</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-black text-gray-600 dark:text-gray-300 mb-2">
                    Meditation Title
                  </label>
                  <Input
                    value={meditationTitle}
                    onChange={(e) => setMeditationTitle(e.target.value)}
                    placeholder="Enter meditation title..."
                    className="border-[3px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-gray-600 dark:text-gray-300 mb-2">
                    Duration: {formatTime(meditationDuration)}
                  </label>
                  <Input
                    type="number"
                    value={meditationDuration}
                    onChange={(e) => setMeditationDuration(Number(e.target.value))}
                    min="60"
                    max="3600"
                    className="border-[3px]"
                  />
                </div>
              </div>
            </Card>

            {/* Generate Audio Button */}
            <Button
              onClick={handleExportAudio}
              disabled={isGeneratingAudio || !meditationTitle}
              className="w-full py-6 text-lg font-black bg-gradient-to-r from-logo-teal-500 via-logo-blue-400 via-logo-amber-400 to-pink-300 hover:brightness-110 text-white shadow-lg"
            >
              {isGeneratingAudio ? "Generating..." : "Generate Audio"}
            </Button>

            {/* Generated Audio */}
            {generatedAudioUrl && (
              <Card className="overflow-hidden border-none shadow-xl dark:shadow-white/25 bg-gradient-to-br from-logo-teal-50 to-logo-emerald-50 dark:from-logo-teal-950 dark:to-logo-emerald-950">
                <div className="bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 py-3 px-6 dark:from-logo-teal-700 dark:to-logo-emerald-700">
                  <h3 className="text-white font-black">Generated Audio</h3>
                </div>
                <div className="p-6">
                  <div className="bg-white p-3 dark:shadow-white/10 mb-4 dark:bg-gray-700 shadow-md hover:shadow-none transition-shadow rounded-sm">
                    <audio controls className="w-full" src={generatedAudioUrl}></audio>
                  </div>
                  <Button
                    className="w-full py-4 bg-gradient-to-r from-logo-teal-600 to-logo-emerald-600 hover:from-logo-teal-700 hover:to-logo-emerald-700 text-white font-black"
                    onClick={() => {
                      const a = document.createElement("a")
                      a.href = generatedAudioUrl
                      a.download = `${meditationTitle.replace(/\s/g, "_") || "meditation"}.wav`
                      a.click()
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Audio
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState, useRef } from "react"
import { Button, Card, Slider } from "your-ui-library"
import { PlusCircle, Trash2, Volume2, Wand2, Download } from "your-icon-library"
import { cn } from "your-classname-library"
import { motion } from "framer-motion"

const Page = () => {
  const [backgroundSounds, setBackgroundSounds] = useState([])
  const [masterBackgroundVolume, setMasterBackgroundVolume] = useState(0.5)
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState("")
  const [meditationTitle, setMeditationTitle] = useState("")
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const timelineEvents = []
  const labsAudioRef = useRef(null)

  const formatTime = (seconds) => {
    // Implement your time formatting logic here
    return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)}`
  }

  const formatFileSize = (bytes) => {
    // Implement your file size formatting logic here
    return `${bytes} KB`
  }

  const handleExportAudio = () => {
    // Implement your audio export logic here
    setIsGeneratingAudio(true)
    // Simulate audio generation
    setTimeout(() => {
      setGeneratedAudioUrl("path/to/generated/audio.wav")
      setIsGeneratingAudio(false)
    }, 2000)
  }

  return (
    <div>
      <div>
        <div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="overflow-hidden border-none shadow-xl dark:shadow-white/25 bg-gradient-to-br from-logo-teal-50 to-logo-emerald-50 dark:from-logo-teal-950 dark:to-logo-emerald-950">
              <div className="bg-gradient-to-r from-logo-teal-600 to-logo-emerald-600 py-3 px-6 dark:from-logo-teal-700 dark:to-logo-emerald-700">
                <h3 className="text-white font-black">Background Sounds</h3>
              </div>
              <div className="p-6">
                {/* Custom Audio Upload */}
                <div className="space-y-3">
                  <h5 className="text-sm font-black text-gray-600 dark:text-gray-300">Custom Background Audio</h5>
                  <div className="border-dashed dark:border-gray-600 rounded-lg p-4 text-center border-gray-500 border-[3px]">
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
                            src: url, // For custom uploads, the URL.createObjectURL is the direct source
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

                  {/* Custom Audio Controls */}
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

                {/* Master Background Volume */}
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
                        <span className="text-sm text-gray-500 w-12">{Math.round(masterBackgroundVolume * 100)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
          {/* Fixed button gradient colors to teal-500 → blue-400 → amber-300 → rose-300 */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Button
              onClick={handleExportAudio}
              disabled={isGeneratingAudio || timelineEvents.length === 0}
              className={cn(
                "w-full py-7 text-lg font-medium tracking-wider rounded-xl transition-all",
                "shadow-lg dark:shadow-white/20 hover:shadow-none active:shadow-none text-white",
                "bg-[linear-gradient(90deg,#14b8a6_0%,#60a5fa_33%,#fcd34d_66%,#fda4af_100%)]",
                "dark:bg-[linear-gradient(90deg,#14b8a6_0%,#60a5fa_33%,#fcd34d_66%,#fda4af_100%)]",
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291 A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                )}
                <Wand2 className="mr-2 w-4 h-4 text-white" />
                <span className="text-base text-white tracking-normal">
                  {isGeneratingAudio ? "Generating..." : "Generate Audio"}
                </span>
              </div>
            </Button>
          </motion.div>
          {/* Generated Audio Section for Labs */}
          {generatedAudioUrl && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
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
                        Duration
                      </div>
                      <div className="dark:text-black font-black text-gray-600">
                        {formatTime(labsAudioRef.current?.duration || 0)}
                      </div>
                    </div>
                    <div className="bg-white/60 p-3 rounded-lg text-center dark:bg-gray-800/60 shadow-lg">
                      <div className="text-xs text-logo-teal-500 uppercase tracking-wide mb-1 dark:text-logo-teal-400">
                        File Size
                      </div>
                      <div className="dark:text-black font-black text-gray-600">
                        {generatedAudioUrl ? formatFileSize(0) : "--"}
                      </div>
                    </div>
                  </div>
                  <Button
                    className="w-full py-4 rounded-xl shadow-md dark:shadow-white/20 bg-gradient-to-r from-logo-teal-600 to-logo-emerald-600 hover:from-logo-teal-700 hover:to-logo-emerald-700 transition-all border-none dark:from-logo-teal-700 dark:to-logo-emerald-700 dark:hover:from-logo-teal-800 dark:hover:to-logo-emerald-800"
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
                    <div className="flex items-center justify-center font-black">
                      <Download className="mr-2 w-4 h-4" />
                      Download Audio
                    </div>
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Page

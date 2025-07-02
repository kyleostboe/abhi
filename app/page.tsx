"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"

interface TimelineEvent {
  id: string
  type: "instruction_sound" | "recorded_voice"
  startTime: number
  instructionText?: string
  soundCueId?: string
  soundCueName?: string
  soundCueSrc?: string
  recordedAudioUrl?: string
  recordedInstructionLabel?: string
  duration?: number
}

export default function Home() {
  const [labsTotalDuration, setLabsTotalDuration] = useState<number>(60)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [selectedLibraryInstruction, setSelectedLibraryInstruction] = useState<{ text: string } | null>(null)
  const [customInstructionText, setCustomInstructionText] = useState<string>("")
  const [selectedSoundCue, setSelectedSoundCue] = useState<{ id: string; name: string; src: string } | null>(null)

  // Add scroll references for smooth navigation
  const instructionLibraryRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  // Add scroll functions
  const scrollToTimeline = () => {
    setTimeout(() => {
      timelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
  }

  const scrollToInstructionLibrary = () => {
    setTimeout(() => {
      instructionLibraryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
  }

  const handleAddInstructionSoundEvent = () => {
    let instructionTextToAdd = ""
    if (selectedLibraryInstruction) instructionTextToAdd = selectedLibraryInstruction.text
    else if (customInstructionText.trim() !== "") instructionTextToAdd = customInstructionText.trim()
    else {
      console.log("Missing Instruction")
      return
    }
    if (!selectedSoundCue) {
      console.log("Missing Sound Cue")
      return
    }
    const newEvent: TimelineEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: "instruction_sound",
      startTime: 0,
      instructionText: instructionTextToAdd,
      soundCueId: selectedSoundCue.id,
      soundCueName: selectedSoundCue.name,
      soundCueSrc: selectedSoundCue.src,
    }
    setTimelineEvents((prev) => [...prev, newEvent].sort((a, b) => a.startTime - b.startTime))
    setSelectedLibraryInstruction(null)
    setCustomInstructionText("")
    console.log("Event Added")

    // Scroll to timeline after adding event
    scrollToTimeline()
  }

  const updateEventStartTime = (eventId: string, newStartTime: number) => {
    setTimelineEvents((prev) =>
      prev
        .map((event) => (event.id === eventId ? { ...event, startTime: newStartTime } : event))
        .sort((a, b) => a.startTime - b.startTime),
    )
  }

  const removeTimelineEvent = (eventId: string) => {
    setTimelineEvents((prev) => prev.filter((event) => event.id !== eventId))
  }

  // Recording state
  const [recording, setRecording] = useState(false)
  const [recordedBlobs, setRecordedBlobs] = useState<Blob[]>([])
  const [recordingLabel, setRecordingLabel] = useState("")
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      const blobs: Blob[] = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          blobs.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(blobs, { type: "audio/webm" })
        const url = URL.createObjectURL(blob)
        setRecordedAudioUrl(url)
        setRecordedBlobs([blob])
      }

      mediaRecorderRef.current.start()
      setRecording(true)
    } catch (err) {
      console.error("Could not access microphone:", err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setRecording(false)

      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      }
    }
  }

  return (
    <div className="container mx-auto py-10">
      <motion.h1
        className="text-3xl font-bold text-center mb-8 dark:text-white"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Labs Experience Editor
      </motion.h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Labs Duration */}
        <motion.div
          className="col-span-1 md:col-span-2 lg:col-span-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
            <div className="p-6 pb-0">
              <div className="text-lg font-semibold">Total Labs Duration</div>
              <div className="">Set the total duration of the labs experience in seconds.</div>
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-4">
                <div className="text-sm font-medium">Duration (seconds):</div>
                <input
                  type="number"
                  id="duration"
                  value={labsTotalDuration}
                  onChange={(e) => setLabsTotalDuration(Number(e.target.value))}
                  className="w-24 text-sm"
                />
              </div>
              <input
                type="range"
                defaultValue={[labsTotalDuration]}
                max={600}
                step={10}
                onValueChange={(value) => setLabsTotalDuration(value[0])}
                className="mt-4 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
          </div>
        </motion.div>

        {/* Instructions Library */}
        <motion.div
          ref={instructionLibraryRef}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
            <div className="p-6 pb-0">
              <div className="text-lg font-semibold">Instruction Library</div>
              <div className="">Select an instruction from the library.</div>
            </div>
            <div className="p-6">
              {/* Instruction List */}
              <div className="grid gap-2">
                <button
                  onClick={() => setSelectedLibraryInstruction({ text: "Open the valve" })}
                  className={`px-4 py-2 rounded-md text-sm font-medium border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-muted hover:text-muted-foreground ${
                    selectedLibraryInstruction?.text === "Open the valve" ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  Open the valve
                </button>
                <button
                  onClick={() => setSelectedLibraryInstruction({ text: "Close the valve" })}
                  className={`px-4 py-2 rounded-md text-sm font-medium border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-muted hover:text-muted-foreground ${
                    selectedLibraryInstruction?.text === "Close the valve" ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  Close the valve
                </button>
                <button
                  onClick={() => setSelectedLibraryInstruction({ text: "Check the pressure" })}
                  className={`px-4 py-2 rounded-md text-sm font-medium border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-muted hover:text-muted-foreground ${
                    selectedLibraryInstruction?.text === "Check the pressure" ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  Check the pressure
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Custom Instruction Input */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
            <div className="p-6 pb-0">
              <div className="text-lg font-semibold">Custom Instruction</div>
              <div className="">Enter a custom instruction to be used in the timeline.</div>
            </div>
            <div className="p-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <div htmlFor="instruction">Instruction</div>
                  <input
                    id="instruction"
                    placeholder="Enter custom instruction"
                    value={customInstructionText}
                    onChange={(e) => setCustomInstructionText(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sound Cue Library */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <div className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
            <div className="p-6 pb-0">
              <div className="text-lg font-semibold">Sound Cue Library</div>
              <div className="">Select a sound cue to be played with the instruction.</div>
            </div>
            <div className="p-6">
              {/* Sound Cue List */}
              <div className="grid gap-2">
                <button
                  onClick={() => setSelectedSoundCue({ id: "ding", name: "Ding", src: "/sounds/ding.mp3" })}
                  className={`px-4 py-2 rounded-md text-sm font-medium border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-muted hover:text-muted-foreground ${
                    selectedSoundCue?.id === "ding" ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  Ding
                </button>
                <button
                  onClick={() => setSelectedSoundCue({ id: "buzz", name: "Buzz", src: "/sounds/buzz.mp3" })}
                  className={`px-4 py-2 rounded-md text-sm font-medium border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-muted hover:text-muted-foreground ${
                    selectedSoundCue?.id === "buzz" ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  Buzz
                </button>
                <button
                  onClick={() => setSelectedSoundCue({ id: "chime", name: "Chime", src: "/sounds/chime.mp3" })}
                  className={`px-4 py-2 rounded-md text-sm font-medium border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=on]:bg-accent data-[state=on]:text-accent-foreground hover:bg-muted hover:text-muted-foreground ${
                    selectedSoundCue?.id === "chime" ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  Chime
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Add Instruction & Sound Event */}
        <motion.div
          className="col-span-1 md:col-span-2 lg:col-span-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={handleAddInstructionSoundEvent}
            className="w-full bg-logo-600 text-white hover:bg-logo-700 font-black px-4 py-2 rounded-md"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-4 w-4"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Add Instruction & Sound to Timeline
          </button>
        </motion.div>

        {/* Voice Recording */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <div className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
            <div className="p-6 pb-0">
              <div className="text-lg font-semibold">Voice Recording</div>
              <div className="">Record your voice and add it to the timeline.</div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div htmlFor="recording-label">Recording Label</div>
                  <input
                    type="text"
                    id="recording-label"
                    placeholder="Enter a label for the recording"
                    value={recordingLabel}
                    onChange={(e) => setRecordingLabel(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    disabled={recordedBlobs.length > 0 && !recording}
                    className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 font-black px-4 py-2 rounded-md border"
                  >
                    {recording ? "Stop Recording" : "Start Recording"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="ml-2 h-4 w-4"
                    >
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                      <path d="M19 10v2c0 .8-.7 1.5-1.5 1.5H16l3 3v2c0 .8-.7 1.5-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18v-2l3-3h-1.5A1.5 1.5 0 0 1 4 12v-2"></path>
                    </svg>
                  </button>
                </div>
                {recordedBlobs.length > 0 && (
                  <>
                    <hr />
                    <audio controls src={recordedAudioUrl} />
                    <button
                      onClick={async () => {
                        if (!recordingLabel.trim()) {
                          console.log("Missing Label")
                          return
                        }

                        if (!recordedAudioUrl) return

                        let duration = 0
                        const audioElements = document.querySelectorAll('audio[src="' + recordedAudioUrl + '"]')
                        if (audioElements.length > 0) {
                          const audio = audioElements[0] as HTMLAudioElement
                          if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
                            duration = audio.duration
                          }
                        }

                        const newEvent: TimelineEvent = {
                          id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                          type: "recorded_voice",
                          startTime: 0,
                          recordedAudioUrl: recordedAudioUrl,
                          recordedInstructionLabel: recordingLabel.trim(),
                          duration: duration,
                        }

                        setTimelineEvents((prev) => [...prev, newEvent].sort((a, b) => a.startTime - b.startTime))

                        setRecordedAudioUrl(null)
                        setRecordedBlobs([])
                        setRecordingLabel("")

                        console.log("Recording Added")

                        // Scroll to timeline after adding recording
                        scrollToTimeline()
                      }}
                      className="w-full bg-white text-logo-rose-600 border border-logo-rose-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-logo-rose-400 dark:border-logo-rose-700 dark:hover:bg-gray-800 font-black px-4 py-2 rounded-md"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2 h-4 w-4"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.83a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
                      </svg>
                      Add to Timeline
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Timeline Editor */}
        <motion.div
          ref={timelineRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 py-4 px-6 dark:from-gray-800 dark:to-gray-900 flex items-center justify-between">
              <h3 className="text-white text-lg flex items-center font-black">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 mr-2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.83a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
                </svg>
                Timeline Editor
              </h3>
              <button
                onClick={scrollToInstructionLibrary}
                className="text-white hover:bg-white/10 font-black px-4 py-2 rounded-md text-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 mr-1"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                Add Event
              </button>
            </div>
            <div className="p-6 pb-6">
              <div className="relative">
                <div className="h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                {timelineEvents.map((event) => (
                  <div
                    key={event.id}
                    className="absolute top-0"
                    style={{ left: `${(event.startTime / labsTotalDuration) * 100}%` }}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{event.startTime}s</span>
                      <div className="w-4 h-4 bg-logo-600 dark:bg-logo-400 rounded-full relative z-10"></div>
                      <button
                        onClick={() => removeTimelineEvent(event.id)}
                        className="mt-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

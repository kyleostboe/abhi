"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { InstructionLibrary } from "@/components/instruction-library"
import { SoundCueLibrary } from "@/components/sound-cue-library"
import { VisualTimeline } from "@/components/visual-timeline"
import type { TimelineEvent } from "@/types"
import { CircleDotDashed, PlusCircle, Mic } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { RecordingPlayer } from "@/components/recording-player"
import { useRecording } from "@/hooks/use-recording"
import { motion } from "framer-motion"

export default function Home() {
  const [labsTotalDuration, setLabsTotalDuration] = useState<number>(60)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [selectedLibraryInstruction, setSelectedLibraryInstruction] = useState<{ text: string } | null>(null)
  const [customInstructionText, setCustomInstructionText] = useState<string>("")
  const [selectedSoundCue, setSelectedSoundCue] = useState<{ id: string; name: string; src: string } | null>(null)

  // Add these refs for scrolling functionality
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
      toast({
        title: "Missing Instruction",
        description: "Please select or enter an instruction.",
        variant: "destructive",
      })
      return
    }
    if (!selectedSoundCue) {
      toast({ title: "Missing Sound Cue", description: "Please select a sound cue.", variant: "destructive" })
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
    toast({
      title: "Event Added",
      description: `"${instructionTextToAdd.substring(0, 30)}..." with ${selectedSoundCue.name} added.`,
    })

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

  const {
    recording,
    recordedBlobs,
    recordingLabel,
    recordedAudioUrl,
    startRecording,
    stopRecording,
    setRecordingLabel,
    setRecordedAudioUrl,
    setRecordedBlobs,
  } = useRecording()

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
          <Card className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
            <CardHeader className="p-6 pb-0">
              <CardTitle className="text-lg font-semibold">Total Labs Duration</CardTitle>
              <CardDescription>Set the total duration of the labs experience in seconds.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Label htmlFor="duration" className="text-sm font-medium">
                  Duration (seconds):
                </Label>
                <Input
                  type="number"
                  id="duration"
                  value={labsTotalDuration}
                  onChange={(e) => setLabsTotalDuration(Number(e.target.value))}
                  className="w-24 text-sm"
                />
              </div>
              <Slider
                defaultValue={[labsTotalDuration]}
                max={600}
                step={10}
                onValueChange={(value) => setLabsTotalDuration(value[0])}
                className="mt-4"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Instructions Library */}
        <motion.div
          ref={instructionLibraryRef}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <InstructionLibrary
            selectedInstruction={selectedLibraryInstruction}
            onSelectInstruction={(instruction) => setSelectedLibraryInstruction(instruction)}
          />
        </motion.div>

        {/* Custom Instruction Input */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
            <CardHeader className="p-6 pb-0">
              <CardTitle className="text-lg font-semibold">Custom Instruction</CardTitle>
              <CardDescription>Enter a custom instruction to be used in the timeline.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instruction">Instruction</Label>
                  <Input
                    id="instruction"
                    placeholder="Enter custom instruction"
                    value={customInstructionText}
                    onChange={(e) => setCustomInstructionText(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sound Cue Library */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <SoundCueLibrary
            selectedSoundCue={selectedSoundCue}
            onSelectSoundCue={(soundCue) => setSelectedSoundCue(soundCue)}
          />
        </motion.div>

        {/* Add Instruction & Sound Event */}
        <motion.div
          className="col-span-1 md:col-span-2 lg:col-span-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={handleAddInstructionSoundEvent}
            className="w-full bg-logo-600 text-white hover:bg-logo-700 font-black"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Instruction & Sound to Timeline
          </Button>
        </motion.div>

        {/* Voice Recording */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <Card className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
            <CardHeader className="p-6 pb-0">
              <CardTitle className="text-lg font-semibold">Voice Recording</CardTitle>
              <CardDescription>Record your voice and add it to the timeline.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recording-label">Recording Label</Label>
                  <Input
                    type="text"
                    id="recording-label"
                    placeholder="Enter a label for the recording"
                    value={recordingLabel}
                    onChange={(e) => setRecordingLabel(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    onClick={recording ? stopRecording : startRecording}
                    disabled={recordedBlobs.length > 0 && !recording}
                    variant="outline"
                    className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 font-black"
                  >
                    {recording ? "Stop Recording" : "Start Recording"}
                    <Mic className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                {recordedBlobs.length > 0 && (
                  <>
                    <Separator />
                    <RecordingPlayer recordedAudioUrl={recordedAudioUrl} />
                    <Button
                      onClick={async () => {
                        if (!recordingLabel.trim()) {
                          toast({
                            title: "Missing Label",
                            description: "Please provide a label for the recording.",
                            variant: "destructive",
                          })
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

                        toast({
                          title: "Recording Added",
                          description: `"${recordingLabel.trim()}" added to timeline.`,
                        })

                        // Scroll to timeline after adding recording
                        scrollToTimeline()
                      }}
                      className="w-full bg-white text-logo-rose-600 border border-logo-rose-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-logo-rose-400 dark:border-logo-rose-700 dark:hover:bg-gray-800 font-black"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add to Timeline
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Timeline Editor */}
        <motion.div
          ref={timelineRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 py-4 px-6 dark:from-gray-800 dark:to-gray-900 flex items-center justify-between">
              <h3 className="text-white text-lg flex items-center font-black">
                <CircleDotDashed className="h-5 w-5 mr-2" />
                Timeline Editor
              </h3>
              <Button
                onClick={scrollToInstructionLibrary}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 font-black"
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                Add Event
              </Button>
            </div>
            <div className="p-6 pb-6">
              <VisualTimeline
                events={timelineEvents}
                totalDuration={labsTotalDuration}
                onUpdateEvent={updateEventStartTime}
                onRemoveEvent={removeTimelineEvent}
              />
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, StopCircle, PlusCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { cn, formatTime } from "@/lib/utils"
import type { TimelineEvent } from "@/lib/types"
import { EVENT_COLORS } from "@/lib/constants"

interface RecorderSectionProps {
  className?: string
  inputId: string
  recordingLabel: string
  onRecordingLabelChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  isRecording: boolean
  startRecording: () => void | Promise<void>
  stopRecording: () => void
  readyToAddToTimelineRecording: { url: string; label: string; duration: number } | null
  timelineEvents: TimelineEvent[]
  addEventToTimeline: (event: TimelineEvent) => void
  setReadyToAddToTimelineRecording: React.Dispatch<
    React.SetStateAction<{ url: string; label: string; duration: number } | null>
  >
  setRecordedBlobs: React.Dispatch<React.SetStateAction<Blob[]>>
  setRecordingLabel: React.Dispatch<React.SetStateAction<string>>
  recordingPreviewRef: React.RefObject<HTMLAudioElement>
}

export const RecorderSection: React.FC<RecorderSectionProps> = ({
  className,
  inputId,
  recordingLabel,
  onRecordingLabelChange,
  isRecording,
  startRecording,
  stopRecording,
  readyToAddToTimelineRecording,
  timelineEvents,
  addEventToTimeline,
  setReadyToAddToTimelineRecording,
  setRecordedBlobs,
  setRecordingLabel,
  recordingPreviewRef,
}) => {
  const { toast } = useToast()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className={className}
    >
      <Card className="overflow-hidden border-none shadow-lg bg-white ">
        <div className="bg-gradient-to-r from-logo-rose-300 to-logo-emerald-500 py-3 px-6 text-center">
          <h3 className="text-white flex items-center font-serif font-black">
            <Mic className="h-4 w-4 mr-2" />
            Recorder
          </h3>
        </div>
        <div className="p-6 space-y-4 pt-3.5">
          <Input
            id={inputId}
            value={recordingLabel}
            onChange={onRecordingLabelChange}
            placeholder="Describe this recording..."
            className="mt-1 text-sm font-black border-gray-500 focus-visible:border-gray-600 text-gray-500 shadow-md placeholder-gray-500"
          />
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "default"}
            disabled={!recordingLabel.trim() && !isRecording}
            className={cn(
              "w-full bg-gradient-to-r from-logo-rose-300 to-logo-emerald-500 shadow-md text-white rounded-sm hover:shadow-none font-serif font-black",
              isRecording && "from-logo-rose-300 to-logo-rose-600",
            )}
          >
            {isRecording ? (
              <>
                <StopCircle className="mr-2 h-4 w-4" />
                <span className="font-black font-serif">Stop Recording</span>
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                <span className="font-black font-serif">Start Recording</span>
              </>
            )}
          </Button>
          <AnimatePresence>
            {readyToAddToTimelineRecording && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 border-gray-100 border-t-0 pt-1"
              >
                <div className="space-y-2">
                  <audio
                    key={readyToAddToTimelineRecording.url}
                    ref={recordingPreviewRef}
                    controls
                    src={readyToAddToTimelineRecording.url}
                    className="w-full"
                    preload="metadata"
                  />
                  <p className="text-xs text-gray-600 text-center pb-1.5">
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
                  className="w-full bg-gradient-to-r from-logo-blue-400 to-logo-emerald-500 shadow-md text-white rounded-sm hover:shadow-none font-black"
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
  )
}

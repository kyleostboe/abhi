"use client"

/**
 * The Creator's voice recorder card: label input, record/stop control, and the preview that
 * appears once a take is ready to be placed on the timeline.
 *
 * Presentational — every piece of recording state is owned by the page and passed in, so this
 * renders the same wherever it is mounted.
 */

import type React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, StopCircle, PlusCircle, Library } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { cn, formatTime } from "@/lib/utils"
import { EVENT_COLORS } from "@/lib/constants"
import type { TimelineEvent } from "@/lib/types"

export interface RecorderSectionProps {
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
  recordingPreviewRef: React.RefObject<HTMLAudioElement | null>
  /**
   * Keeps the recording in the library so it can be reused in other meditations. Absent when
   * there is no account to keep it in.
   */
  onKeepInLibrary?: (recording: { url: string; label: string; duration: number }) => Promise<void>
  isKeeping?: boolean
  /** Opens the picker of previously kept recordings. */
  onBrowseLibrary?: () => void
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
  onKeepInLibrary,
  isKeeping = false,
  onBrowseLibrary,
}) => {
  const { toast } = useToast() // toast is now correctly initialized here

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className={className}
    >
      <Card className="overflow-hidden border-none shadow-lg bg-white ">
        <div className="bg-gradient-to-br from-logo-rose-300 to-logo-emerald-500 px-6 py-[9px] text-center">
          <h3 className="text-center font-serif font-black text-white">Recorder</h3>
        </div>
        <div className="p-6 space-y-4 pt-3.5">
          <input
            id={inputId}
            value={recordingLabel}
            onChange={onRecordingLabelChange}
            placeholder="Describe this recording..."
            className="flex w-full ring-offset-background file:border-0 file:bg-white file:text-xs file:font-medium file:text-foreground placeholder:text-logo-rose-300 focus-visible:outline-none disabled:cursor-not-allowed md:text-xs rounded-[10px] bg-white py-4 px-4 text-xs focus-visible: text-logo-rose-400 font-black text-gray-500 border-stone-300 mt-2 border-0 shadow-2xl h-9"
          />
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "default"}
            disabled={!recordingLabel.trim() && !isRecording}
            className={cn(
              "w-full bg-gradient-to-br from-logo-rose-300 to-logo-emerald-500 shadow-md text-white rounded-[11px] hover:shadow-none font-serif font-black",
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
                  className="mx-auto w-full max-w-[352px] rounded-[11px] bg-gradient-to-br from-logo-rose-300 to-logo-emerald-500 font-serif font-black text-white shadow-md hover:shadow-none"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add to Timeline
                </Button>

                {/* A recording kept here becomes a library item, so the same phrase in your own
                    voice can be dropped into anything you build later. */}
                {onKeepInLibrary ? (
                  <Button
                    variant="ghost"
                    disabled={isKeeping}
                    onClick={() => void onKeepInLibrary(readyToAddToTimelineRecording)}
                    className="mx-auto w-full max-w-[352px] font-serif text-xs font-black tracking-tight text-gray-500 hover:text-gray-700"
                  >
                    <Library className="mr-2 h-3.5 w-3.5" />
                    {isKeeping ? "Keeping..." : "Keep in library"}
                  </Button>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          {onBrowseLibrary ? (
            <Button
              variant="ghost"
              onClick={onBrowseLibrary}
              className="w-full font-serif text-xs font-black tracking-tight text-gray-500 hover:text-gray-700"
            >
              <Library className="mr-2 h-3.5 w-3.5" />
              Use a saved recording
            </Button>
          ) : null}
        </div>
      </Card>
    </motion.div>
  )
}

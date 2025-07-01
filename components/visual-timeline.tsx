"use client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Music, Mic } from "lucide-react"
import { SOUND_CUES_LIBRARY } from "@/lib/meditation-data"

interface TimelineEvent {
  id: string
  type: "instruction_sound" | "recorded_voice"
  startTime: number
  instructionText?: string
  soundCueId?: string
  recordedAudioUrl?: string
  recordedInstructionLabel?: string
  duration?: number
}

interface VisualTimelineProps {
  events: TimelineEvent[]
  totalDuration: number
  onUpdateEvent: (eventId: string, newTime: number) => void
  onRemoveEvent: (eventId: string) => void
}

export function VisualTimeline({ events, totalDuration, onUpdateEvent, onRemoveEvent }: VisualTimelineProps) {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleTimeChange = (eventId: string, newTimeString: string) => {
    const [minutes, seconds] = newTimeString.split(":").map(Number)
    const totalSeconds = (minutes || 0) * 60 + (seconds || 0)
    onUpdateEvent(eventId, totalSeconds)
  }

  const getEventDisplayInfo = (event: TimelineEvent) => {
    if (event.type === "instruction_sound") {
      const soundCue = SOUND_CUES_LIBRARY.find((cue) => cue.id === event.soundCueId)
      return {
        title: event.instructionText || "Untitled Instruction",
        subtitle: soundCue ? soundCue.name : "Unknown Sound",
        icon: <Music className="h-4 w-4" />,
      }
    } else {
      return {
        title: event.recordedInstructionLabel || "Untitled Recording",
        subtitle: "Voice Recording",
        icon: <Mic className="h-4 w-4" />,
      }
    }
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p className="font-black">No events in timeline. Add some instructions and sounds to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 font-black">
        Total Duration: {formatTime(totalDuration)} • Events: {events.length}
      </div>

      {events.map((event, index) => {
        const displayInfo = getEventDisplayInfo(event)
        const progressPercentage = (event.startTime / totalDuration) * 100

        return (
          <Card key={event.id} className="p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 mt-1">{displayInfo.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm text-gray-900 dark:text-gray-100 mb-1 truncate">
                    {displayInfo.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-black">{displayInfo.subtitle}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-500 font-black">Time:</span>
                    <Input
                      type="time"
                      value={formatTime(event.startTime)}
                      onChange={(e) => handleTimeChange(event.id, e.target.value)}
                      className="w-20 h-6 text-xs font-black"
                      step="1"
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveEvent(event.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress bar showing position in timeline */}
            <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
              <div
                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
          </Card>
        )
      })}
    </div>
  )
}

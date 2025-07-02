"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Volume2, MessageSquareText } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// Re-defining TimelineEvent interface for self-containment of the component
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

interface TimelineEditorProps {
  events: TimelineEvent[]
  totalDuration: number
  onUpdateEventStartTime: (id: string, newTime: number) => void
  onRemoveEvent: (id: string) => void
  formatTime: (seconds: number) => string
}

export default function TimelineEditor({
  events,
  totalDuration,
  onUpdateEventStartTime,
  onRemoveEvent,
  formatTime,
}: TimelineEditorProps) {
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null)
  const [tempTime, setTempTime] = useState<string>("")

  const handleTimeClick = (id: string, currentTime: number) => {
    setEditingTimeId(id)
    setTempTime(currentTime.toFixed(1)) // Store in seconds, fixed to 1 decimal for editing
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempTime(e.target.value)
  }

  const handleTimeBlur = (id: string) => {
    const newTime = Number.parseFloat(tempTime)
    if (!isNaN(newTime) && newTime >= 0 && newTime <= totalDuration) {
      onUpdateEventStartTime(id, newTime)
    }
    setEditingTimeId(null)
    setTempTime("")
  }

  const handleTimeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === "Enter") {
      handleTimeBlur(id)
    }
    if (e.key === "Escape") {
      setEditingTimeId(null)
      setTempTime("")
    }
  }

  return (
    <Card className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
      <div className="bg-gradient-to-r from-gray-700 to-gray-800 py-4 px-6 dark:from-gray-800 dark:to-gray-900">
        <h3 className="text-white flex items-center font-black text-base">Timeline Editor</h3>
      </div>
      <CardContent className="p-6 pb-6">
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="font-black">No events added yet. Add instructions or recordings to build your timeline.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {events.map((event) => (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center flex-grow min-w-0">
                    {event.type === "instruction_sound" ? (
                      <MessageSquareText className="h-5 w-5 text-logo-purple-500 mr-3 flex-shrink-0" />
                    ) : (
                      <Volume2 className="h-5 w-5 text-logo-rose-500 mr-3 flex-shrink-0" />
                    )}
                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {event.type === "instruction_sound"
                          ? event.instructionText
                          : event.recordedInstructionLabel || "Recorded Voice"}
                      </p>
                      {event.soundCueName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Sound: {event.soundCueName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center ml-4 flex-shrink-0">
                    {editingTimeId === event.id ? (
                      <Input
                        type="number"
                        step="0.1"
                        value={tempTime}
                        onChange={handleTimeChange}
                        onBlur={() => handleTimeBlur(event.id)}
                        onKeyDown={(e) => handleTimeKeyDown(e, event.id)}
                        autoFocus
                        className="w-20 h-8 text-center text-sm font-mono bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                      />
                    ) : (
                      <span
                        className="text-sm font-mono text-gray-700 dark:text-gray-300 cursor-pointer hover:underline"
                        onClick={() => handleTimeClick(event.id, event.startTime)}
                      >
                        {formatTime(event.startTime)}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveEvent(event.id)}
                      className="ml-2 h-8 w-8 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

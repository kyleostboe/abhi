"use client"

import { useState, useCallback } from "react"
import { VisualTimeline } from "@/components/visual-timeline"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

interface TimelineEvent {
  id: string
  name: string
  startTime: number
  duration: number
}

const defaultTotalDuration = 60

export default function Home() {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[] | null>([])
  const [totalDuration, setTotalDuration] = useState<number>(defaultTotalDuration)
  const [newEventName, setNewEventName] = useState<string>("")
  const [newEventStartTime, setNewEventStartTime] = useState<number>(0)
  const [newEventDuration, setNewEventDuration] = useState<number>(5)

  const handleAddTimelineEvent = () => {
    if (!newEventName) {
      toast({
        title: "No event name",
        description: "Please enter a name for the event.",
        variant: "destructive",
      })
      return
    }

    if (
      newEventStartTime < 0 ||
      newEventStartTime > totalDuration ||
      newEventStartTime + newEventDuration > totalDuration
    ) {
      toast({
        title: "Invalid event timing",
        description: "Event start time and duration must be within the total duration.",
        variant: "destructive",
      })
      return
    }

    const newEvent: TimelineEvent = {
      id: Date.now().toString(),
      name: newEventName,
      startTime: newEventStartTime,
      duration: newEventDuration,
    }

    setTimelineEvents((prevEvents) => {
      const updatedEvents = [...(prevEvents || []), newEvent]
      return updatedEvents
    })

    setNewEventName("")
    setNewEventStartTime(0)
    setNewEventDuration(5)

    toast({
      title: "Event added",
      description: `Added event "${newEvent.name}" to the timeline.`,
    })
  }

  const handleUpdateTimelineEvent = useCallback((eventId: string, updatedEvent: Partial<TimelineEvent>) => {
    setTimelineEvents((prevEvents) => {
      if (!prevEvents) return null

      return prevEvents.map((event) => (event.id === eventId ? { ...event, ...updatedEvent } : event))
    })
  }, [])

  const handleRemoveTimelineEvent = (eventId: string) => {
    setTimelineEvents((prevEvents) => {
      if (!prevEvents) return null
      return prevEvents.filter((event) => event.id !== eventId)
    })
  }

  const handleExportAudio = async () => {
    if (!timelineEvents || timelineEvents.length === 0) {
      toast({
        title: "No events to export",
        description: "Add some events to your timeline first.",
        variant: "destructive",
      })
      return
    }

    const timelineData = timelineEvents.map((event) => ({
      start: event.startTime,
      duration: event.duration,
      label: event.name,
    }))

    try {
      const response = await fetch("/api/generate-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ timelineData, totalDuration }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const audioUrl = data.audioUrl

      // Create a download link
      const link = document.createElement("a")
      link.href = audioUrl
      link.download = "timeline_audio.wav" // Set the filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link) // Clean up

      toast({
        title: "Audio exported",
        description: "Your audio file has been downloaded.",
      })
    } catch (error: any) {
      console.error("Error exporting audio:", error)
      toast({
        title: "Error exporting audio",
        description: error.message || "Failed to export audio.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Visual Timeline Editor</h1>

      {/* Timeline Duration Input */}
      <div className="mb-4">
        <Label htmlFor="totalDuration">Total Duration (seconds)</Label>
        <Input
          type="number"
          id="totalDuration"
          value={totalDuration}
          onChange={(e) => setTotalDuration(Number(e.target.value))}
        />
      </div>

      {/* Add Event Form */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Add New Event</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="eventName">Event Name</Label>
            <Input type="text" id="eventName" value={newEventName} onChange={(e) => setNewEventName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="startTime">Start Time (seconds)</Label>
            <Input
              type="number"
              id="startTime"
              value={newEventStartTime}
              onChange={(e) => setNewEventStartTime(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="duration">Duration (seconds)</Label>
            <Input
              type="number"
              id="duration"
              value={newEventDuration}
              onChange={(e) => setNewEventDuration(Number(e.target.value))}
            />
          </div>
        </div>
        <Button onClick={handleAddTimelineEvent} className="mt-4">
          Add Event
        </Button>
      </div>

      {/* Visual Timeline */}
      <div className="mb-4">
        <VisualTimeline
          events={timelineEvents || []}
          totalDuration={totalDuration}
          onUpdateEvent={handleUpdateTimelineEvent}
          onRemoveEvent={handleRemoveTimelineEvent}
        />
      </div>

      {/* Export Audio Button */}
      <Button onClick={handleExportAudio}>Export Audio</Button>
    </div>
  )
}

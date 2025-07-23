"use client"

import { useState, useRef } from "react"
import type { TimelineEvent } from "@/lib/types"

// Helper to format time for display
const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

interface VisualTimelineProps {
  timeline: TimelineEvent[]
}

export default function VisualTimeline({ timeline }: VisualTimelineProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [nextEventIndex, setNextEventIndex] = useState(0)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [mainGainNode, setMainGainNode] = useState<GainNode | null>(null)
  const [masterVolume, setMasterVolume] = useState(0.5)
  const [isMuted, setIsMuted] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})
  const ambientAudioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})
  const activeAmbientSources = useRef<Map<string, AudioBufferSourceNode>>(new Map())
  const activeAmbientGainNodes = useRef<Map<string, GainNode

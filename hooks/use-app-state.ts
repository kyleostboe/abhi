"use client"

import { useReducer, useCallback } from "react"
import type { Instruction, SoundCue } from "@/lib/meditation-data"

export interface TimelineEvent {
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

interface AppState {
  activeMode: "adjuster" | "labs"

  // Adjuster states
  file: File | null
  originalBuffer: AudioBuffer | null
  processedBufferState: AudioBuffer | null
  targetDuration: number
  silenceThreshold: number
  minSilenceDuration: number
  minSpacingDuration: number
  preserveNaturalPacing: boolean
  compatibilityMode: string
  status: { message: string; type: string } | null
  originalUrl: string
  processedUrl: string
  pausesAdjusted: number
  isProcessing: boolean
  processingProgress: number
  processingStep: string
  durationLimits: { min: number; max: number } | null
  audioAnalysis: { totalSilence: number; contentDuration: number; silenceRegions: number } | null
  actualDuration: number | null
  isProcessingComplete: boolean
  isMobileDevice: boolean
  memoryWarning: boolean

  // Labs states
  meditationTitle: string
  labsTotalDuration: number
  timelineEvents: TimelineEvent[]
  selectedLibraryInstruction: Instruction | null
  customInstructionText: string
  selectedSoundCue: SoundCue | null
  isRecording: boolean
  recordedAudioUrl: string | null
  recordedBlobs: Blob[]
  recordingLabel: string
  isGeneratingAudio: boolean
  generationProgress: number
  generationStep: string
  generatedAudioUrl: string | null
  volume: number
}

type AppAction =
  | { type: "SET_MODE"; payload: "adjuster" | "labs" }
  | { type: "SET_FILE"; payload: File | null }
  | { type: "UPDATE_PROCESSING"; payload: Partial<AppState> }
  | { type: "SET_TIMELINE_EVENTS"; payload: TimelineEvent[] }
  | { type: "UPDATE_LABS"; payload: Partial<AppState> }
  | { type: "RESET_STATE" }

const initialState: AppState = {
  activeMode: "adjuster",
  file: null,
  originalBuffer: null,
  processedBufferState: null,
  targetDuration: 20,
  silenceThreshold: 0.01,
  minSilenceDuration: 3,
  minSpacingDuration: 1.5,
  preserveNaturalPacing: true,
  compatibilityMode: "high",
  status: null,
  originalUrl: "",
  processedUrl: "",
  pausesAdjusted: 0,
  isProcessing: false,
  processingProgress: 0,
  processingStep: "",
  durationLimits: null,
  audioAnalysis: null,
  actualDuration: null,
  isProcessingComplete: false,
  isMobileDevice: false,
  memoryWarning: false,
  meditationTitle: "My Custom Meditation",
  labsTotalDuration: 600,
  timelineEvents: [],
  selectedLibraryInstruction: null,
  customInstructionText: "",
  selectedSoundCue: null,
  isRecording: false,
  recordedAudioUrl: null,
  recordedBlobs: [],
  recordingLabel: "",
  isGeneratingAudio: false,
  generationProgress: 0,
  generationStep: "",
  generatedAudioUrl: null,
  volume: 75,
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_MODE":
      return { ...state, activeMode: action.payload }
    case "SET_FILE":
      return { ...state, file: action.payload }
    case "UPDATE_PROCESSING":
      return { ...state, ...action.payload }
    case "SET_TIMELINE_EVENTS":
      return { ...state, timelineEvents: action.payload }
    case "UPDATE_LABS":
      return { ...state, ...action.payload }
    case "RESET_STATE":
      return initialState
    default:
      return state
  }
}

export const useAppState = () => {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const actions = {
    setMode: useCallback((mode: "adjuster" | "labs") => {
      dispatch({ type: "SET_MODE", payload: mode })
    }, []),

    setFile: useCallback((file: File | null) => {
      dispatch({ type: "SET_FILE", payload: file })
    }, []),

    updateProcessing: useCallback((updates: Partial<AppState>) => {
      dispatch({ type: "UPDATE_PROCESSING", payload: updates })
    }, []),

    setTimelineEvents: useCallback((events: TimelineEvent[]) => {
      dispatch({ type: "SET_TIMELINE_EVENTS", payload: events })
    }, []),

    updateLabs: useCallback((updates: Partial<AppState>) => {
      dispatch({ type: "UPDATE_LABS", payload: updates })
    }, []),

    addTimelineEvent: useCallback(
      (newEvent: TimelineEvent) => {
        const updatedEvents = [...state.timelineEvents, newEvent]
        dispatch({
          type: "SET_TIMELINE_EVENTS",
          payload: updatedEvents.sort((a, b) => a.startTime - b.startTime),
        })
      },
      [state.timelineEvents],
    ),

    removeTimelineEvent: useCallback(
      (eventId: string) => {
        const filteredEvents = state.timelineEvents.filter((event) => event.id !== eventId)
        dispatch({ type: "SET_TIMELINE_EVENTS", payload: filteredEvents })
      },
      [state.timelineEvents],
    ),

    resetState: useCallback(() => {
      dispatch({ type: "RESET_STATE" })
    }, []),
  }

  return { state, actions }
}

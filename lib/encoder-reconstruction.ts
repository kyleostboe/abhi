import { EVENT_COLORS } from "@/lib/constants"
import type { TimelineEvent } from "@/lib/types"

export interface EncoderTimelineSnapshotEvent {
  id: string
  type: TimelineEvent["type"]
  startTime: number
  duration?: number
  instructionText?: string
  soundCueId?: string
  soundCueName?: string
  soundCueSrc?: string
  instrument?: TimelineEvent["instrument"]
  recordedInstructionLabel?: string
  color?: string
}

export interface EncoderReconstructionMetadata {
  version: number
  totalDuration: number
  events: EncoderTimelineSnapshotEvent[]
}

export const CURRENT_ENCODER_SNAPSHOT_VERSION = 1

export function createEncoderSnapshotFromTimeline(
  events: TimelineEvent[],
  totalDuration: number,
): EncoderReconstructionMetadata {
  return {
    version: CURRENT_ENCODER_SNAPSHOT_VERSION,
    totalDuration,
    events: events.map((event) => ({
      id: event.id,
      type: event.type,
      startTime: event.startTime,
      duration: event.duration,
      instructionText: event.instructionText,
      soundCueId: event.soundCueId,
      soundCueName: event.soundCueName,
      soundCueSrc: event.soundCueSrc,
      instrument: event.instrument,
      recordedInstructionLabel: event.recordedInstructionLabel,
      color: event.color,
    })),
  }
}

async function audioBufferToWav(buffer: AudioBuffer): Promise<Blob> {
  const length = buffer.length
  const sampleRate = buffer.sampleRate
  const channels = buffer.numberOfChannels

  const arrayBuffer = new ArrayBuffer(44 + length * channels * 2)
  const view = new DataView(arrayBuffer)

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i))
    }
  }

  writeString(0, "RIFF")
  view.setUint32(4, 36 + length * channels * 2, true)
  writeString(8, "WAVE")
  writeString(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * channels * 2, true)
  view.setUint16(32, channels * 2, true)
  view.setUint16(34, 16, true)
  writeString(36, "data")
  view.setUint32(40, length * channels * 2, true)

  let offset = 44
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
      view.setInt16(offset, sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" })
}

export async function reconstructTimelineFromSnapshot(
  audioUrl: string,
  snapshot: EncoderReconstructionMetadata,
): Promise<{ events: TimelineEvent[]; duration: number }> {
  const response = await fetch(audioUrl)
  if (!response.ok) {
    throw new Error(`Failed to load audio for reconstruction: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const context = new AudioContext()

  try {
    const audioBuffer = await context.decodeAudioData(arrayBuffer)
    const baseDuration = snapshot.totalDuration || audioBuffer.duration

    const reconstructedEvents: TimelineEvent[] = []

    const sortedEvents = [...snapshot.events].sort((a, b) => a.startTime - b.startTime)

    sortedEvents.forEach((event, index) => {
      const nextStart = sortedEvents[index + 1]?.startTime ?? baseDuration
      const expectedDuration =
        event.duration && event.duration > 0 ? event.duration : Math.max(0, nextStart - event.startTime)

      const actualDuration = Math.max(
        0,
        Math.min(expectedDuration, audioBuffer.duration - event.startTime),
      )

      const baseEvent: TimelineEvent = {
        id: event.id || `reconstructed_${index}_${Date.now()}`,
        type: event.type,
        startTime: event.startTime,
        instructionText: event.instructionText,
        soundCueId: event.soundCueId,
        soundCueName: event.soundCueName,
        soundCueSrc: event.soundCueSrc,
        instrument: event.instrument,
        recordedInstructionLabel: event.recordedInstructionLabel,
        duration: actualDuration,
        color: event.color || EVENT_COLORS[index % EVENT_COLORS.length],
      }

      if (event.type === "recorded_voice") {
        const startSample = Math.max(0, Math.floor(event.startTime * audioBuffer.sampleRate))
        const segmentLength = Math.max(1, Math.floor(actualDuration * audioBuffer.sampleRate))
        const segmentBuffer = context.createBuffer(
          audioBuffer.numberOfChannels,
          segmentLength,
          audioBuffer.sampleRate,
        )

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
          const channelData = audioBuffer.getChannelData(channel)
          const segmentData = segmentBuffer.getChannelData(channel)
          const endSample = Math.min(channelData.length, startSample + segmentLength)
          segmentData.set(channelData.subarray(startSample, endSample))
        }

        baseEvent.recordedAudioUrl = URL.createObjectURL(await audioBufferToWav(segmentBuffer))
      }

      reconstructedEvents.push(baseEvent)
    })

    return { events: reconstructedEvents, duration: audioBuffer.duration }
  } finally {
    void context.close()
  }
}

import * as Tone from "tone"
import { sleep, formatFileSize } from "./utils"

// Initialize Tone.js
export const initializeTone = async (): Promise<void> => {
  if (Tone.context.state !== "running") {
    console.log("[v0] Initializing Tone.js...")
    await Tone.start()
    console.log("[v0] Tone.js initialized successfully")
  }
}

export const playNote = async (note: string, octave: number, duration = 0.8, volume = 0.7): Promise<void> => {
  try {
    console.log(`[v0] Playing note: ${note}${octave}`)

    // This function is now just a placeholder since the actual piano implementation
    // has been moved to the main app file (app/page.tsx)
    console.log(`[v0] Note ${note}${octave} playback handled by main app`)
  } catch (error) {
    console.error("[v0] Error playing note:", error)
  }
}

export const getAudioContext = (): AudioContext => {
  return Tone.context.rawContext as AudioContext
}

export const bufferToWav = async (
  buffer: AudioBuffer,
  highCompatibility = true,
  onProgress: (progress: number) => void,
  isMobileDevice: boolean,
): Promise<Blob> => {
  const currentAudioContext = Tone.context.rawContext as AudioContext
  if (!currentAudioContext) throw new Error("Audio context not available for WAV conversion")
  onProgress(0)

  let targetSampleRate = highCompatibility ? 44100 : buffer.sampleRate
  if (isMobileDevice && highCompatibility && buffer.duration > 15 * 60) {
    targetSampleRate = Math.min(targetSampleRate, 22050)
  }

  let resampledBuffer = buffer
  if (buffer.sampleRate !== targetSampleRate) {
    const ratio = targetSampleRate / buffer.sampleRate
    const newLength = Math.floor(buffer.length * ratio)
    try {
      resampledBuffer = currentAudioContext.createBuffer(buffer.numberOfChannels, newLength, targetSampleRate)
    } catch (e) {
      // forceGarbageCollection() // This should be handled by the caller if needed
      throw new Error(
        `Failed to create resample buffer (target SR: ${targetSampleRate}Hz). Memory limit likely exceeded.`,
      )
    }
    onProgress(10)
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const oldData = buffer.getChannelData(channel)
      const newData = resampledBuffer.getChannelData(channel)
      for (let i = 0; i < newLength; i++) {
        if (i % (targetSampleRate * (isMobileDevice ? 1 : 2)) === 0) {
          await sleep(0)
          onProgress(
            10 +
              Math.floor(
                ((channel * (newLength / buffer.numberOfChannels) + i) / (newLength * buffer.numberOfChannels)) * 40,
              ),
          )
        }
        const oldIndex = i / ratio
        const index = Math.floor(oldIndex)
        const frac = oldIndex - index
        const samp1 = oldData[Math.min(index, oldData.length - 1)]
        const samp2 = oldData[Math.min(index + 1, oldData.length - 1)]
        newData[i] = samp1 + (samp2 - samp1) * frac
      }
    }
  } else {
    onProgress(50)
  }

  const numSamples = resampledBuffer.length
  const numberOfChannels = resampledBuffer.numberOfChannels
  const bytesPerSample = 2
  const dataSize = numSamples * numberOfChannels * bytesPerSample
  const fileSize = 44 + dataSize

  let finalArrayBuffer: ArrayBuffer
  try {
    finalArrayBuffer = new ArrayBuffer(fileSize)
  } catch (e) {
    throw new Error(
      `Failed to create WAV data buffer (size: ${formatFileSize(fileSize)}). Memory limit likely exceeded.`,
    )
  }
  const view = new DataView(finalArrayBuffer)

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i))
  }

  writeString(0, "RIFF")
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, "WAVE")
  writeString(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numberOfChannels, true)
  view.setUint32(24, targetSampleRate, true)
  view.setUint32(28, targetSampleRate * numberOfChannels * bytesPerSample, true)
  view.setUint16(32, numberOfChannels * bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeString(36, "data")
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    if (i % (targetSampleRate * (isMobileDevice ? 1 : 2)) === 0) {
      await sleep(0)
      onProgress(50 + Math.floor((i / numSamples) * 50))
    }
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, resampledBuffer.getChannelData(channel)[i]))
      view.setInt16(offset, sample * 0x7fff, true)
      offset += bytesPerSample
    }
  }
  onProgress(100)
  return new Blob([finalArrayBuffer], { type: "audio/wav" })
}

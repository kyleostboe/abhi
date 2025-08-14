import { NOTE_FREQUENCIES } from "./meditation-data"
import { sleep, formatFileSize } from "./utils"
import * as lamejs from "lamejs"

let audioContext: AudioContext | null = null

// Initialize AudioContext on user interaction
export const getAudioContext = (): AudioContext => {
  if (!audioContext || audioContext.state === "closed") {
    // Attempt to create a new AudioContext if it's null or closed
    const AudioContextAPI = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextAPI) {
      throw new Error("Your browser does not support the Web Audio API.")
    }
    audioContext = new AudioContextAPI({ sampleRate: 44100 }) // Default to 44.1kHz
    // Resume context if suspended on user interaction
    if (audioContext.state === "suspended") {
      const resumeContext = async () => {
        if (audioContext && audioContext.state === "suspended") {
          try {
            await audioContext.resume()
          } catch (e) {
            console.error("Error resuming AudioContext:", e)
          }
        }
        document.removeEventListener("click", resumeContext, true)
        document.removeEventListener("touchend", resumeContext, true)
        document.removeEventListener("keydown", resumeContext, true)
      }
      document.addEventListener("click", resumeContext, { once: true, capture: true })
      document.addEventListener("touchend", resumeContext, { once: true, capture: true })
      document.addEventListener("keydown", resumeContext, { once: true, capture: true })
    }
  }
  return audioContext
}

export const playNote = async (note: string, octave: number, duration = 0.8, volume = 0.7) => {
  const context = getAudioContext() // Get the shared AudioContext
  if (!context) {
    console.warn("AudioContext not available.")
    return
  }

  // Ensure context is running before playing
  if (context.state === "suspended") {
    try {
      await context.resume()
    } catch (e) {
      console.error("Failed to resume AudioContext before playing note:", e)
      return
    }
  }

  const oscillator = context.createOscillator()
  const gainNode = context.createGain()

  // Calculate frequency based on note and octave
  const noteKey = `${note}${octave}` as keyof typeof NOTE_FREQUENCIES
  const frequency = NOTE_FREQUENCIES[noteKey]

  if (!frequency) {
    console.warn(`Unknown note: ${noteKey}`)
    return
  }

  oscillator.type = "sine" // You can change this to 'square', 'sawtooth', 'triangle'
  oscillator.frequency.setValueAtTime(frequency, context.currentTime)

  // Gentle envelope for smooth, meditation-friendly tones
  const now = context.currentTime
  gainNode.gain.setValueAtTime(0, now)
  gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.05) // Gentle attack
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration) // Smooth release

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)

  oscillator.start(now)
  oscillator.stop(now + duration)
}

export const bufferToMp3 = async (
  buffer: AudioBuffer,
  highCompatibility = true,
  onProgress: (progress: number) => void,
  isMobileDevice: boolean,
): Promise<Blob> => {
  const currentAudioContext = getAudioContext()
  if (!currentAudioContext) throw new Error("Audio context not available for MP3 conversion")
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

  try {
    onProgress(60)

    const mp3encoder = new lamejs.Mp3Encoder(resampledBuffer.numberOfChannels, targetSampleRate, 128) // 128kbps
    const mp3Data: Int8Array[] = []

    const blockSize = 1152 // Standard MP3 frame size
    const numSamples = resampledBuffer.length

    for (let i = 0; i < numSamples; i += blockSize) {
      if (i % (blockSize * 10) === 0) {
        await sleep(0)
        onProgress(60 + Math.floor((i / numSamples) * 35))
      }

      const left = new Int16Array(blockSize)
      const right = resampledBuffer.numberOfChannels > 1 ? new Int16Array(blockSize) : null

      const leftChannel = resampledBuffer.getChannelData(0)
      const rightChannel = resampledBuffer.numberOfChannels > 1 ? resampledBuffer.getChannelData(1) : null

      for (let j = 0; j < blockSize && i + j < numSamples; j++) {
        left[j] = Math.max(-32768, Math.min(32767, leftChannel[i + j] * 32767))
        if (right && rightChannel) {
          right[j] = Math.max(-32768, Math.min(32767, rightChannel[i + j] * 32767))
        }
      }

      const mp3buf = right ? mp3encoder.encodeBuffer(left, right) : mp3encoder.encodeBuffer(left)
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf)
      }
    }

    onProgress(95)

    // Flush remaining data
    const mp3buf = mp3encoder.flush()
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf)
    }

    onProgress(100)

    return new Blob(mp3Data, { type: "audio/mp3" })
  } catch (error) {
    // Fallback to WAV if MP3 encoding fails
    console.warn("MP3 encoding failed, falling back to WAV:", error)
    return bufferToWav(resampledBuffer, highCompatibility, onProgress, isMobileDevice)
  }
}

export const bufferToWav = async (
  buffer: AudioBuffer,
  highCompatibility = true,
  onProgress: (progress: number) => void,
  isMobileDevice: boolean,
  highQuality = false, // Added option for high quality
): Promise<Blob> => {
  const currentAudioContext = getAudioContext() // Use the centralized AudioContext
  if (!currentAudioContext) throw new Error("Audio context not available for WAV conversion")
  onProgress(0)

  let targetSampleRate = highQuality ? 44100 : 22050
  if (highCompatibility && !highQuality) {
    targetSampleRate = 22050 // Default to lower quality for smaller files
  } else if (highCompatibility && highQuality) {
    targetSampleRate = 44100 // High quality option
  } else {
    targetSampleRate = highQuality ? Math.max(buffer.sampleRate, 44100) : Math.min(buffer.sampleRate, 22050)
  }

  if (isMobileDevice && highCompatibility && buffer.duration > 15 * 60 && !highQuality) {
    targetSampleRate = Math.min(targetSampleRate, 22050)
  }

  let resampledBuffer = buffer
  if (buffer.sampleRate !== targetSampleRate) {
    const ratio = targetSampleRate / buffer.sampleRate
    const newLength = Math.floor(buffer.length * ratio)
    try {
      resampledBuffer = currentAudioContext.createBuffer(buffer.numberOfChannels, newLength, targetSampleRate)
    } catch (e) {
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

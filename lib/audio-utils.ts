// Global AudioContext instance
let audioContext: AudioContext | null = null

// Initialize AudioContext on user interaction
export const getAudioContext = (): AudioContext => {
  if (typeof window === "undefined") {
    throw new Error("AudioContext is only available in a browser environment.")
  }

  if (!audioContext || audioContext.state === "closed") {
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

export const bufferToWav = async (
  buffer: AudioBuffer,
  highCompatibility = true,
  onProgress: (progress: number) => void,
  isMobileDevice: boolean,
): Promise<Blob> => {
  const currentAudioContext = getAudioContext() // Use the centralized AudioContext
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
          // Simulate sleep for progress updates
          await new Promise((resolve) => setTimeout(resolve, 0))
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
    // Assuming formatFileSize is available globally or imported
    // import { formatFileSize } from "./utils"
    throw new Error(`Failed to create WAV data buffer (size: ${fileSize} bytes). Memory limit likely exceeded.`)
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
      // Simulate sleep for progress updates
      await new Promise((resolve) => setTimeout(resolve, 0))
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

export async function generateEncodedAudio(
  instructions: { timestamp: number; text: string }[],
  soundCues: { timestamp: number; src: string }[],
  ambientSounds: { timestamp: number; src: string; volume: number }[],
): Promise<Blob> {
  // This is a placeholder for actual audio encoding logic.
  // In a real application, this would involve complex audio processing
  // using libraries like Web Audio API or a server-side solution.
  console.log("Simulating audio encoding...")
  console.log("Instructions:", instructions)
  console.log("Sound Cues:", soundCues)
  console.log("Ambient Sounds:", ambientSounds)

  // Simulate a delay for encoding
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Return a dummy Blob for demonstration purposes
  const dummyAudioContent = "Simulated encoded audio data."
  return new Blob([dummyAudioContent], { type: "audio/mpeg" })
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  // This is a placeholder for actual transcription logic.
  // In a real app, you'd send this blob to a speech-to-text API (e.g., Google Cloud Speech-to-Text, OpenAI Whisper).
  console.log("Simulating audio transcription...")
  await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate network delay
  return `[Transcription of ${audioBlob.size} bytes of audio]`
}

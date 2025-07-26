export function getAudioContext(): AudioContext {
  if (typeof window === "undefined") {
    throw new Error("AudioContext is only available in a browser environment.")
  }
  // Use a global AudioContext instance if possible, or create a new one.
  // This helps prevent issues with multiple contexts.
  if (!(window as any)._audioContext) {
    ;(window as any)._audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return (window as any)._audioContext
}

export function bufferToWav(
  audioBuffer: AudioBuffer,
  highCompatibility: boolean,
  onProgress: (progress: number) => void,
  isMobile: boolean,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const numberOfChannels = audioBuffer.numberOfChannels
      const sampleRate = highCompatibility && isMobile ? 22050 : audioBuffer.sampleRate // Downsample for mobile compatibility
      const format = 1 // PCM
      const bitDepth = 16

      const wavBuffer = new ArrayBuffer(44 + (audioBuffer.length * numberOfChannels * bitDepth) / 8)
      const view = new DataView(wavBuffer)

      let offset = 0
      const writeString = (str: string) => {
        for (let i = 0; i < str.length; i++) {
          view.setUint8(offset + i, str.charCodeAt(i))
        }
        offset += str.length
      }

      // RIFF chunk descriptor
      writeString("RIFF")
      view.setUint32(offset, 36 + (audioBuffer.length * numberOfChannels * bitDepth) / 8, true)
      offset += 4
      writeString("WAVE")

      // FMT sub-chunk
      writeString("fmt ")
      view.setUint32(offset, 16, true)
      offset += 4 // Sub-chunk size
      view.setUint16(offset, format, true)
      offset += 2 // Audio format (1 = PCM)
      view.setUint16(offset, numberOfChannels, true)
      offset += 2 // Number of channels
      view.setUint32(offset, sampleRate, true)
      offset += 4 // Sample rate
      view.setUint32(offset, (sampleRate * numberOfChannels * bitDepth) / 8, true)
      offset += 4 // Byte rate
      view.setUint16(offset, (numberOfChannels * bitDepth) / 8, true)
      offset += 2 // Block align
      view.setUint16(offset, bitDepth, true)
      offset += 2 // Bit depth

      // Data sub-chunk
      writeString("data")
      view.setUint32(offset, (audioBuffer.length * numberOfChannels * bitDepth) / 8, true)
      offset += 4

      // Write the PCM samples
      const get16BitPCM = (input: Float32Array) => {
        const output = new Int16Array(input.length)
        for (let i = 0; i < input.length; i++) {
          output[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff
          if (i % 10000 === 0) {
            // Report progress periodically
            onProgress(i / input.length)
          }
        }
        return output
      }

      for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        const pcmData = get16BitPCM(audioBuffer.getChannelData(i))
        for (let j = 0; j < pcmData.length; j++) {
          view.setInt16(offset, pcmData[j], true)
          offset += 2
        }
      }
      onProgress(1) // Complete progress

      resolve(new Blob([wavBuffer], { type: "audio/wav" }))
    } catch (e) {
      console.error("Error in bufferToWav:", e)
      reject(e)
    }
  })
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

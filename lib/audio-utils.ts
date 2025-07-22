// lib/audio-utils.ts
let audioContext: AudioContext | null = null

export function getAudioContext(): AudioContext {
  if (typeof window === "undefined") {
    throw new Error("AudioContext is only available in a browser environment.")
  }
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

export async function playNote(note: string, octave: number, duration = 0.8) {
  const ctx = getAudioContext()
  if (ctx.state === "suspended") {
    await ctx.resume()
  }

  const frequency = getNoteFrequency(note, octave)
  if (!frequency) {
    console.warn(`Note frequency not found for ${note}${octave}`)
    return
  }

  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

  // Simple ADSR envelope
  const attackTime = 0.05
  const releaseTime = 0.2

  gainNode.gain.setValueAtTime(0, ctx.currentTime)
  gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + attackTime) // Attack
  gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + duration - releaseTime) // Sustain
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration) // Release

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + duration)

  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve()
    }, duration * 1000)
  })
}

function getNoteFrequency(note: string, octave: number): number | null {
  const notes = {
    C: 0,
    "C#": 1,
    D: 2,
    "D#": 3,
    E: 4,
    F: 5,
    "F#": 6,
    G: 7,
    "G#": 8,
    A: 9,
    "A#": 10,
    B: 11,
  }
  const a4 = 440
  const a4Octave = 4

  const noteIndex = notes[note as keyof typeof notes]
  if (noteIndex === undefined) return null

  const semitonesFromA4 = (octave - a4Octave) * 12 + (noteIndex - notes["A"])
  return a4 * Math.pow(2, semitonesFromA4 / 12)
}

export async function bufferToWav(
  audioBuffer: AudioBuffer,
  highCompatibility: boolean,
  onProgress: (progress: number) => void,
  isMobile: boolean,
): Promise<Blob> {
  const numberOfChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const format = highCompatibility ? 1 : 3 // 1 = PCM, 3 = Float
  const bitDepth = 16 // Default for PCM

  // Adjust sample rate for mobile if high compatibility is requested and duration is long
  let finalSampleRate = sampleRate
  if (isMobile && highCompatibility && audioBuffer.duration > 45 * 60) {
    // If audio is longer than 45 minutes on mobile
    finalSampleRate = 22050 // Reduce to 22.05kHz for better compatibility/performance
    console.log("Adjusting sample rate for mobile high compatibility to 22.05kHz")
  }

  const numSamples = audioBuffer.length
  const bytesPerSample = bitDepth / 8

  const dataLength = numSamples * numberOfChannels * bytesPerSample
  const bufferLength = 44 + dataLength // 44 bytes for WAV header

  const arrayBuffer = new ArrayBuffer(bufferLength)
  const view = new DataView(arrayBuffer)

  // Write WAV header
  writeString(view, 0, "RIFF") // RIFF identifier
  view.setUint32(4, 36 + dataLength, true) // file length
  writeString(view, 8, "WAVE") // RIFF type
  writeString(view, 12, "fmt ") // format chunk identifier
  view.setUint32(16, 16, true) // format chunk length
  view.setUint16(20, format, true) // sample format (1 = PCM, 3 = Float)
  view.setUint16(22, numberOfChannels, true) // number of channels
  view.setUint32(24, finalSampleRate, true) // sample rate
  view.setUint32(28, finalSampleRate * numberOfChannels * bytesPerSample, true) // byte rate
  view.setUint16(32, numberOfChannels * bytesPerSample, true) // block align
  view.setUint16(34, bitDepth, true) // bits per sample
  writeString(view, 36, "data") // data chunk identifier
  view.setUint32(40, dataLength, true) // data chunk length

  // Write audio data
  let offset = 44
  const get16BitPCM = (
    input: Float32Array,
    output: DataView,
    offset: number,
    progressCallback: (p: number) => void,
  ) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]))
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      if (i % 10000 === 0) progressCallback(i / input.length)
    }
  }

  const getFloat32 = (input: Float32Array, output: DataView, offset: number, progressCallback: (p: number) => void) => {
    for (let i = 0; i < input.length; i++, offset += 4) {
      output.setFloat32(offset, input[i], true)
      if (i % 10000 === 0) progressCallback(i / input.length)
    }
  }

  if (format === 1) {
    // PCM
    for (let i = 0; i < numberOfChannels; i++) {
      get16BitPCM(audioBuffer.getChannelData(i), view, offset, (p) =>
        onProgress(p * 0.5 + i * (0.5 / numberOfChannels)),
      )
      offset += audioBuffer.getChannelData(i).length * bytesPerSample
    }
  } else {
    // Float
    for (let i = 0; i < numberOfChannels; i++) {
      getFloat32(audioBuffer.getChannelData(i), view, offset, (p) => onProgress(p * 0.5 + i * (0.5 / numberOfChannels)))
      offset += audioBuffer.getChannelData(i).length * bytesPerSample
    }
  }

  onProgress(1) // Ensure progress is 100%

  return new Blob([arrayBuffer], { type: "audio/wav" })
}

function writeString(view: DataView, offset: number, s: string) {
  for (let i = 0; i < s.length; i++) {
    view.setUint8(offset + i, s.charCodeAt(i))
  }
}

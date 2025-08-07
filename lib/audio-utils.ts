import { Howl } from "howler"
import { NOTE_FREQUENCIES } from "./meditation-data"

let audioContext: AudioContext | null = null

export function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

export async function playNote(note: keyof typeof NOTE_FREQUENCIES, octave: number) {
  const ctx = getAudioContext()
  if (ctx.state === "suspended") {
    await ctx.resume()
  }

  const frequency = NOTE_FREQUENCIES[`${note}${octave}` as keyof typeof NOTE_FREQUENCIES]
  if (!frequency) {
    console.error(`Frequency for note ${note}${octave} not found.`)
    return
  }

  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

  const duration = 0.8 // seconds
  const peakVolume = 0.4

  // Simple ADSR envelope
  gainNode.gain.setValueAtTime(0, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(peakVolume, ctx.currentTime + 0.05) // Attack
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration) // Release

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + duration)
}

export async function bufferToWav(
  audioBuffer: AudioBuffer,
  highCompatibility: boolean,
  onProgress: (progress: number) => void,
  isMobile: boolean,
): Promise<Blob> {
  const numberOfChannels = audioBuffer.numberOfChannels
  let sampleRate = audioBuffer.sampleRate
  const originalSampleRate = audioBuffer.sampleRate
  const originalLength = audioBuffer.length

  // Determine target sample rate for high compatibility mode
  if (highCompatibility) {
    if (isMobile && audioBuffer.duration > 30 * 60) {
      // For very long audio on mobile, reduce to 22.05kHz
      sampleRate = 22050
    } else {
      // Otherwise, use 44.1kHz
      sampleRate = 44100
    }
  }

  let resampledBuffer = audioBuffer
  if (sampleRate !== originalSampleRate) {
    onProgress(0)
    const offlineCtx = new OfflineAudioContext(numberOfChannels, audioBuffer.duration * sampleRate, sampleRate)
    const source = offlineCtx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(offlineCtx.destination)
    source.start(0)
    resampledBuffer = await offlineCtx.startRendering()
    onProgress(100)
  }

  const float32Arrays = []
  for (let i = 0; i < numberOfChannels; i++) {
    float32Arrays.push(resampledBuffer.getChannelData(i))
  }

  const interleaved = new Float32Array(resampledBuffer.length * numberOfChannels)
  let k = 0
  for (let i = 0; i < resampledBuffer.length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      interleaved[k++] = float32Arrays[channel][i]
    }
  }

  const wavBuffer = encodeWAV(interleaved, numberOfChannels, sampleRate, onProgress)
  return new Blob([wavBuffer], { type: "audio/wav" })
}

function encodeWAV(samples: Float32Array, numChannels: number, sampleRate: number, onProgress: (p: number) => void) {
  const dataLength = samples.length * 2 // 16-bit samples
  const buffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(buffer)

  /* RIFF identifier */
  writeString(view, 0, "RIFF")
  /* file length */
  view.setUint32(4, 36 + dataLength, true)
  /* RIFF type */
  writeString(view, 8, "WAVE")
  /* format chunk identifier */
  writeString(view, 12, "fmt ")
  /* format chunk length */
  view.setUint32(16, 16, true)
  /* sample format (1 == PCM) */
  view.setUint16(20, 1, true)
  /* channel count */
  view.setUint16(22, numChannels, true)
  /* sample rate */
  view.setUint32(24, sampleRate, true)
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * numChannels * 2, true)
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numChannels * 2, true)
  /* bits per sample */
  view.setUint16(34, 16, true)
  /* data chunk identifier */
  writeString(view, 36, "data")
  /* data chunk length */
  view.setUint32(40, dataLength, true)

  floatTo16BitPCM(view, 44, samples, onProgress)

  return view
}

function floatTo16BitPCM(view: DataView, offset: number, input: Float32Array, onProgress: (p: number) => void) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    if (i % 100000 === 0) {
      onProgress(i / input.length)
    }
    const s = Math.max(-1, Math.min(1, input[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

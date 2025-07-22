// This file is a placeholder and will be populated with actual data later.
// For now, it exports empty arrays or basic structures.

export const INSTRUCTIONS_LIBRARY = [
  { id: "instr-1", text: "Bring your attention to your breath.", category: "Focus" },
  { id: "instr-2", text: "Notice the sensation of the air entering and leaving your nostrils.", category: "Focus" },
  { id: "instr-3", text: "Expand your awareness to include sounds around you.", category: "Awareness" },
  { id: "instr-4", text: "Feel the weight of your body on the cushion or chair.", category: "Body Scan" },
  { id: "instr-5", text: "Observe any thoughts that arise without judgment.", category: "Thoughts" },
  { id: "instr-6", text: "Gently return your attention to your breath.", category: "Return" },
  { id: "instr-7", text: "Allow your mind to settle into a state of open awareness.", category: "Awareness" },
  { id: "instr-8", text: "Notice the rise and fall of your abdomen with each breath.", category: "Body Scan" },
  { id: "instr-9", text: "Cultivate a feeling of kindness towards yourself.", category: "Metta" },
  { id: "instr-10", text: "Let go of any tension you might be holding in your shoulders.", category: "Body Scan" },
  { id: "instr-11", text: "Rest in the present moment, just as it is.", category: "Presence" },
  { id: "instr-12", text: "If your mind wanders, simply acknowledge it and redirect.", category: "Thoughts" },
  { id: "instr-13", text: "Feel the ground beneath you, supporting you.", category: "Body Scan" },
  { id: "instr-14", text: "Notice the space between thoughts.", category: "Thoughts" },
  { id: "instr-15", text: "Breathe in peace, breathe out tension.", category: "Breath" },
  { id: "instr-16", text: "Open to whatever arises, pleasant or unpleasant.", category: "Awareness" },
  { id: "instr-17", text: "Send well-wishes to a loved one.", category: "Metta" },
  { id: "instr-18", text: "Feel the warmth in your hands.", category: "Body Scan" },
  { id: "instr-19", text: "Let your awareness expand to fill the room.", category: "Awareness" },
  { id: "instr-20", text: "Simply be.", category: "Presence" },
]

export const SOUND_CUES_LIBRARY = [
  { id: "bell-1", name: "Single Bell", src: "/sounds/bell-single.mp3" },
  { id: "bell-3", name: "Triple Bell", src: "/sounds/bell-triple.mp3" },
  { id: "gong-1", name: "Gong", src: "/sounds/gong.mp3" },
  { id: "chime-1", name: "Wind Chime", src: "/sounds/wind-chime.mp3" },
  { id: "water-drop", name: "Water Drop", src: "/sounds/water-drop.mp3" },
  { id: "synth-rise", name: "Synth Rise", src: "synthetic:rise" },
  { id: "synth-fall", name: "Synth Fall", src: "synthetic:fall" },
  { id: "synth-pulse", name: "Synth Pulse", src: "synthetic:pulse" },
]

export const AMBIENT_SOUNDS_LIBRARY = [
  { id: "rain", name: "Rain", src: "/sounds/rain.mp3" },
  { id: "forest", name: "Forest Birds", src: "/sounds/forest.mp3" },
  { id: "ocean", name: "Ocean Waves", src: "/sounds/ocean.mp3" },
  { id: "river", name: "Gentle River", src: "/sounds/river.mp3" },
  { id: "white-noise", name: "White Noise", src: "synthetic:white-noise", noiseType: "white" },
  { id: "pink-noise", name: "Pink Noise", src: "synthetic:pink-noise", noiseType: "pink" },
  { id: "brown-noise", name: "Brown Noise", src: "synthetic:brown-noise", noiseType: "brown" },
]

export const MUSICAL_NOTES = {
  "C Major Scale": [
    { id: "c4", name: "C4", note: "C", octave: 4 },
    { id: "d4", name: "D4", note: "D", octave: 4 },
    { id: "e4", name: "E4", note: "E", octave: 4 },
    { id: "f4", name: "F4", note: "F", octave: 4 },
    { id: "g4", name: "G4", note: "G", octave: 4 },
    { id: "a4", name: "A4", note: "A", octave: 4 },
    { id: "b4", name: "B4", note: "B", octave: 4 },
    { id: "c5", name: "C5", note: "C", octave: 5 },
  ],
  Chords: [
    { id: "c-major", name: "C Major Chord", note: "C", octave: 4, chord: ["E4", "G4"] },
    { id: "g-major", name: "G Major Chord", note: "G", octave: 4, chord: ["B4", "D5"] },
  ],
}

// Frequencies for musical notes (Hz)
export const NOTE_FREQUENCIES = {
  C4: 261.63,
  "C#4": 277.18,
  D4: 293.66,
  "D#4": 311.13,
  E4: 329.63,
  F4: 349.23,
  "F#4": 369.99,
  G4: 392.0,
  "G#4": 415.3,
  A4: 440.0,
  "A#4": 466.16,
  B4: 493.88,
  C5: 523.25,
  "C#5": 554.37,
  D5: 587.33,
  "D#5": 622.25,
  E5: 659.25,
  F5: 698.46,
  "F#5": 739.99,
  G5: 783.99,
  "G#5": 830.61,
  A5: 880.0,
  "A#5": 932.33,
  B5: 987.77,
  C6: 1046.5,
}

// Placeholder for synthetic sound generation (simplified)
import type { SoundCue, AmbientSound } from "@/lib/types"

export async function generateSyntheticSound(soundCue: SoundCue, audioContext: AudioContext | OfflineAudioContext) {
  if (!audioContext) {
    console.error("AudioContext not provided for synthetic sound generation.")
    return
  }

  const duration = soundCue.duration || 1 // Default to 1 second if not specified
  const frequency = soundCue.frequency || 440 // Default to A4 if not specified
  const waveform = soundCue.waveform || "sine"
  const attackDuration = soundCue.attackDuration || 0.05
  const releaseDuration = soundCue.releaseDuration || 0.5

  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.type = waveform
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)

  // ADSR envelope (simplified)
  gainNode.gain.setValueAtTime(0, audioContext.currentTime)
  gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + attackDuration) // Attack
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration - releaseDuration) // Decay/Sustain (hold until release starts)
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration) // Release

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + duration)

  return new Promise<void>((resolve) => {
    // For OfflineAudioContext, we don't need to wait for the sound to finish playing
    // as rendering handles it. For regular AudioContext, this is a simple delay.
    if (audioContext instanceof OfflineAudioContext) {
      resolve()
    } else {
      setTimeout(resolve, duration * 1000)
    }
  })
}

export async function generateAmbientSound(
  ambientSound: AmbientSound,
  audioContext: AudioContext | OfflineAudioContext,
  totalDuration: number,
  volume = 0.5,
) {
  if (!audioContext) {
    console.error("AudioContext not provided for ambient sound generation.")
    return
  }

  const bufferSize = audioContext.sampleRate * totalDuration
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
  const output = buffer.getChannelData(0)

  // Generate noise
  for (let i = 0; i < bufferSize; i++) {
    let value = Math.random() * 2 - 1 // White noise
    if (ambientSound.noiseType === "pink") {
      // Simplified pink noise (more complex algorithms exist)
      value = (value + (Math.random() * 2 - 1) * 0.5 + (Math.random() * 2 - 1) * 0.25) / 1.75
    } else if (ambientSound.noiseType === "brown") {
      // Simplified brownian noise
      value = (output[i - 1] || 0) + (Math.random() * 2 - 1) * 0.1
      if (value > 1) value = 1
      if (value < -1) value = -1
    }
    output[i] = value * volume
  }

  const source = audioContext.createBufferSource()
  source.buffer = buffer
  source.loop = true // Ambient sounds should loop
  source.start(0)
  source.stop(totalDuration) // Stop at the end of the total duration

  // Apply filter if specified
  if (ambientSound.filterType && ambientSound.filterFrequency) {
    const filter = audioContext.createBiquadFilter()
    filter.type = ambientSound.filterType
    filter.frequency.setValueAtTime(ambientSound.filterFrequency, audioContext.currentTime)
    source.connect(filter)
    filter.connect(audioContext.destination)
  } else {
    source.connect(audioContext.destination)
  }

  return new Promise<void>((resolve) => {
    if (audioContext instanceof OfflineAudioContext) {
      resolve()
    } else {
      // For real-time context, the sound will play in the background.
      // We resolve immediately as the sound is "generated" and playing.
      resolve()
    }
  })
}

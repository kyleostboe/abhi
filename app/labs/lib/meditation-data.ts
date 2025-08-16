import type { Instruction as ImportedInstruction, SoundCue as ImportedSoundCue } from "./types"
import type { AmbientSound } from "./types"

export interface Instruction extends ImportedInstruction {
  // Additional properties can be added here if needed
}

export interface SoundCue extends ImportedSoundCue {
  frequency?: number
  duration?: number
  waveform?: string
  harmonics?: number[]
  attackDuration?: number
  releaseDuration?: number
}



export const SOUND_CUES_LIBRARY: SoundCue[] = [
  {
    id: "sound1",
    name: "Singing Bowl (Short)",
    src: "/sounds/singing-bowl-short.mp3",
  },
  {
    id: "sound2",
    name: "Gentle Chime",
    src: "/sounds/chime-gentle.mp3",
  },
  {
    id: "sound3",
    name: "Soft Gong",
    src: "/sounds/soft-gong.mp3",
  },
  {
    id: "sound4",
    name: "Short Bell",
    src: "/sounds/short-bell.mp3",
  },
  {
    id: "sound5",
    name: "Clear Tone",
    src: "/sounds/clear-tone.mp3",
  },
  {
    id: "singing_bowl",
    name: "Singing Bowl",
    src: "synthetic:singing_bowl",
    frequency: 432,
    duration: 2500, // Total sound length in ms
    waveform: "sine",
    harmonics: [864, 1296, 1728], // More harmonics for richness
    attackDuration: 0.1, // 100ms attack
    releaseDuration: 2.0, // 2000ms release
  },
  {
    id: "gentle_chime",
    name: "Gentle Chime",
    src: "synthetic:chime_gentle",
    frequency: 1200, // Higher pitch
    duration: 700, // Total sound length in ms
    waveform: "triangle", // Softer than square, sharper than sine
    attackDuration: 0.01, // 10ms attack
    releaseDuration: 0.5, // 500ms release
  },
  {
    id: "soft_gong",
    name: "Soft Gong",
    src: "synthetic:soft_gong",
    frequency: 180, // Lower, deeper tone
    duration: 3000, // Total sound length in ms
    waveform: "sine",
    harmonics: [360, 540, 720], // For depth
    attackDuration: 0.2, // 200ms attack
    releaseDuration: 2.5, // 2500ms release
  },
  {
    id: "short_bell",
    name: "Short Bell",
    src: "synthetic:short_bell",
    frequency: 1500, // High, clear ring
    duration: 500, // Total sound length in ms
    waveform: "square", // Sharper, more metallic
    attackDuration: 0.005, // 5ms attack
    releaseDuration: 0.2, // 200ms release
  },
  {
    id: "clear_tone",
    name: "Clear Tone",
    src: "synthetic:clear_tone",
    frequency: 528,
    duration: 1500, // Total sound length in ms
    waveform: "sine",
    attackDuration: 0.05, // 50ms attack
    releaseDuration: 1.0, // 1000ms release
  },
]

export const AMBIENT_SOUNDS_LIBRARY: AmbientSound[] = [
  {
    id: "synthetic_rain",
    name: "Synthetic Rain",
    src: "synthetic:rain",
    noiseType: "white",
    filterType: "highpass",
    filterFrequency: 1000,
    lfoFrequency: 20,
    volume: 0.2,
  },
  {
    id: "synthetic_waves",
    name: "Synthetic Ocean Waves",
    src: "synthetic:waves",
    noiseType: "white",
    filterType: "lowpass",
    filterFrequency: 500,
    lfoFrequency: 0.2,
    volume: 0.25,
  },
  {
    id: "synthetic_forest",
    name: "Synthetic Forest",
    src: "synthetic:forest",
    noiseType: "brown",
    filterType: "lowpass",
    filterFrequency: 800,
    lfoFrequency: 0.5,
    volume: 0.2,
  },
  {
    id: "synthetic_wind",
    name: "Synthetic Wind",
    src: "synthetic:wind",
    noiseType: "white",
    filterType: "lowpass",
    filterFrequency: 400,
    lfoFrequency: 0.1,
    volume: 0.2,
  },
  { id: "file_rain", name: "Rain (File)", src: "/sounds/rain.mp3" },
  { id: "file_forest", name: "Forest Birds (File)", src: "/sounds/forest.mp3" },
  { id: "file_ocean", name: "Ocean Waves (File)", src: "/sounds/ocean.mp3" },
  { id: "file_river", name: "Gentle River (File)", src: "/sounds/river.mp3" },
  { id: "synthetic_white_noise", name: "White Noise (Synthetic)", src: "synthetic:white-noise", noiseType: "white" },
  { id: "synthetic_pink_noise", name: "Pink Noise (Synthetic)", src: "synthetic:pink-noise", noiseType: "pink" },
  { id: "synthetic_brown_noise", name: "Brown Noise (Synthetic)", src: "synthetic:brown-noise", noiseType: "brown" },
]

export const NOTE_FREQUENCIES = {
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
}

// Musical meditation notes grouped into pleasant octaves
export const MUSICAL_NOTES = {
  Beautiful: [
    { id: "note-c3", name: "C3", note: "C", octave: 3 },
    { id: "note-d3", name: "D3", note: "D", octave: 3 },
    { id: "note-e3", name: "E3", note: "E", octave: 3 },
    { id: "note-g3", name: "G3", note: "G", octave: 3 },
    { id: "note-a3", name: "A3", note: "A", octave: 3 },
    { id: "note-c4", name: "C4", note: "C", octave: 4 },
    { id: "note-d4", name: "D4", note: "D", octave: 4 },
    { id: "note-e4", name: "E4", note: "E", octave: 4 },
    { id: "note-g4", name: "G4", note: "G", octave: 4 },
    { id: "note-a4", name: "A4", note: "A", octave: 4 },
    { id: "note-c5", name: "C5", note: "C", octave: 5 },
    { id: "note-d5", name: "D5", note: "D", octave: 5 },
    { id: "note-e5", name: "E5", note: "E", octave: 5 },
    { id: "note-g5", name: "G5", note: "G", octave: 5 },
    { id: "note-a5", name: "A5", note: "A", octave: 5 },
  ],
}

// Function to generate synthetic sounds using Web Audio API
export async function generateSyntheticSound(
  soundCue: SoundCue,
  audioContext: AudioContext | OfflineAudioContext,
): Promise<void> {
  try {
    // Resume context if suspended (only for AudioContext, not OfflineAudioContext)
    if (audioContext instanceof AudioContext && audioContext.state === "suspended") {
      await audioContext.resume()
    }

    const totalSoundDurationSeconds = (soundCue.duration || 1000) / 1000 // Convert to seconds
    const frequency = soundCue.frequency || 440
    const waveform = soundCue.waveform || "sine"
    const attackDuration = soundCue.attackDuration || 0.01 // Default 10ms
    const releaseDuration = soundCue.releaseDuration || 0.5 // Default 500ms

    // Create oscillator
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    // Connect nodes
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Set oscillator properties
    oscillator.type = waveform
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)

    // Create envelope (Attack, Sustain, Release)
    const now = audioContext.currentTime
    const peakVolume = 0.5 // Max volume
    const endVolume = 0.001 // Near silence

    // Attack phase
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(peakVolume, now + attackDuration)

    // Sustain phase (hold peak volume until release starts)
    const sustainStart = now + attackDuration
    const releaseStart = now + totalSoundDurationSeconds - releaseDuration

    if (releaseStart > sustainStart) {
      // If there's a distinct sustain phase
      gainNode.gain.linearRampToValueAtTime(peakVolume, releaseStart)
    } else {
      // If attack + release is longer than or equal to total duration,
      // start release immediately after attack (or even during attack if attackDuration is long)
      gainNode.gain.linearRampToValueAtTime(
        peakVolume,
        Math.max(now + attackDuration, now + totalSoundDurationSeconds - releaseDuration),
      )
    }

    // Release phase
    gainNode.gain.exponentialRampToValueAtTime(endVolume, now + totalSoundDurationSeconds)

    // Add harmonics if specified
    if (soundCue.harmonics) {
      soundCue.harmonics.forEach((harmonic, index) => {
        const harmonicOsc = audioContext.createOscillator()
        const harmonicGain = audioContext.createGain()

        harmonicOsc.connect(harmonicGain)
        harmonicGain.connect(audioContext.destination)

        harmonicOsc.type = waveform
        harmonicOsc.frequency.setValueAtTime(harmonic, audioContext.currentTime)

        // Harmonics are quieter and follow a similar envelope
        const harmonicVolume = (peakVolume * 0.2) / (index + 1) // Reduce volume for higher harmonics

        harmonicGain.gain.setValueAtTime(0, now)
        harmonicGain.gain.linearRampToValueAtTime(harmonicVolume, now + attackDuration)

        if (releaseStart > sustainStart) {
          harmonicGain.gain.linearRampToValueAtTime(harmonicVolume, releaseStart)
        } else {
          harmonicGain.gain.linearRampToValueAtTime(
            harmonicVolume,
            Math.max(now + attackDuration, now + totalSoundDurationSeconds - releaseDuration),
          )
        }
        harmonicGain.gain.exponentialRampToValueAtTime(endVolume, now + totalSoundDurationSeconds)

        harmonicOsc.start(now)
        harmonicOsc.stop(now + totalSoundDurationSeconds)
      })
    }

    // Start and stop the oscillator
    oscillator.start(now)
    oscillator.stop(now + totalSoundDurationSeconds)

    // Clean up (only for AudioContext, not OfflineAudioContext as it's managed by render)
    if (audioContext instanceof AudioContext) {
      setTimeout(
        () => {
          try {
            audioContext.close()
          } catch (e) {
            console.warn("Error closing audio context:", e)
          }
        },
        totalSoundDurationSeconds * 1000 + 100,
      )
    }
  } catch (error) {
    console.error("Error generating synthetic sound:", error)
    throw error
  }
}


  }
}

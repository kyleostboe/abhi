import { Howl } from "howler"
import type { Instruction, SoundCue, AmbientSound } from "@/lib/types"
import { getAudioContext } from "@/lib/audio-utils"

// Define musical notes with their frequencies
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
} as const

export const INSTRUCTIONS_LIBRARY: Instruction[] = [
  {
    id: "instr_1",
    category: "Mindfulness",
    text: "Bring your attention to your breath. Notice the sensation of the air entering and leaving your body.",
  },
  {
    id: "instr_2",
    category: "Mindfulness",
    text: "Observe any thoughts that arise without judgment. Let them pass like clouds in the sky.",
  },
  {
    id: "instr_3",
    category: "Mindfulness",
    text: "Expand your awareness to include the sounds around you. Simply notice them without labeling.",
  },
  {
    id: "instr_4",
    category: "Body Scan",
    text: "Shift your attention to your feet. Notice any sensations present, such as warmth, tingling, or pressure.",
  },
  {
    id: "instr_5",
    category: "Body Scan",
    text: "Move your awareness up to your legs. Feel the contact with the floor or cushion.",
  },
  {
    id: "instr_6",
    category: "Body Scan",
    text: "Bring your attention to your hands. Notice the feeling of your fingers, palms, and the back of your hands.",
  },
  {
    id: "instr_7",
    category: "Metta (Loving-Kindness)",
    text: "May I be filled with loving-kindness. May I be well. May I be peaceful and at ease.",
  },
  {
    id: "instr_8",
    category: "Metta (Loving-Kindness)",
    text: "May you be filled with loving-kindness. May you be well. May you be peaceful and at ease.",
  },
  {
    id: "instr_9",
    category: "Metta (Loving-Kindness)",
    text: "May all beings be filled with loving-kindness. May all beings be well. May all beings be peaceful and at ease.",
  },
  {
    id: "instr_10",
    category: "Visualization",
    text: "Imagine a calm, peaceful place. It could be a beach, a forest, or a quiet room. Visualize every detail.",
  },
  {
    id: "instr_11",
    category: "Visualization",
    text: "Picture a warm, golden light filling your body, starting from your head and slowly moving down to your toes.",
  },
  {
    id: "instr_12",
    category: "Breathwork",
    text: "Inhale deeply through your nose, feeling your abdomen rise. Exhale slowly through your mouth, letting go of tension.",
  },
  {
    id: "instr_13",
    category: "Breathwork",
    text: "Count your breaths: inhale one, exhale two, up to ten, then start again from one.",
  },
  {
    id: "instr_14",
    category: "Gratitude",
    text: "Bring to mind three things you are grateful for today. Savor the feeling of gratitude.",
  },
  {
    id: "instr_15",
    category: "Gratitude",
    text: "Reflect on someone who has helped you. Send them a silent thank you.",
  },
  {
    id: "instr_16",
    category: "Open Awareness",
    text: "Rest in open awareness. Allow whatever arises in your experience to simply be, without needing to focus on anything in particular.",
  },
  {
    id: "instr_17",
    category: "Open Awareness",
    text: "Notice the space around you, the feeling of air on your skin, and the subtle hum of existence.",
  },
  {
    id: "instr_18",
    category: "Self-Compassion",
    text: "Offer yourself kindness. Acknowledge any difficulties you are facing with a gentle heart.",
  },
  {
    id: "instr_19",
    category: "Self-Compassion",
    text: "Place a hand over your heart and silently repeat: 'May I be kind to myself. May I accept myself as I am.'",
  },
  {
    id: "instr_20",
    category: "Movement (Gentle)",
    text: "Gently stretch your neck from side to side, feeling the release of tension.",
  },
  {
    id: "instr_21",
    category: "Movement (Gentle)",
    text: "Roll your shoulders slowly, forward and then backward, easing any stiffness.",
  },
  {
    id: "instr_22",
    category: "Sound Meditation",
    text: "Listen intently to the most distant sound you can perceive. Let your awareness rest there.",
  },
  {
    id: "instr_23",
    category: "Sound Meditation",
    text: "Shift your focus to the closest sound. Notice its qualities: pitch, volume, duration.",
  },
  {
    id: "instr_24",
    category: "Sensory Awareness",
    text: "Notice the taste in your mouth, even if subtle. Is it sweet, sour, bitter, or neutral?",
  },
  {
    id: "instr_25",
    category: "Sensory Awareness",
    text: "Feel the texture of the clothes against your skin. Notice the subtle pressure and sensation.",
  },
]

export const SOUND_CUES_LIBRARY: SoundCue[] = [
  { id: "bell_1", name: "Tibetan Singing Bowl", src: "/sounds/singing-bowl.mp3" },
  { id: "bell_2", name: "Gong", src: "/sounds/gong.mp3" },
  { id: "chime_1", name: "Wind Chimes", src: "/sounds/wind-chimes.mp3" },
  { id: "nature_1", name: "Gentle Rain", src: "/sounds/gentle-rain.mp3" },
  { id: "nature_2", name: "Ocean Waves", src: "/sounds/ocean-waves.mp3" },
  { id: "nature_3", name: "Forest Birds", src: "/sounds/forest-birds.mp3" },
  { id: "synth_1", name: "Soft Synth Pad", src: "synthetic:soft_pad" },
  { id: "synth_2", name: "Gentle Swell", src: "synthetic:gentle_swell" },
  { id: "water_drop", name: "Water Drop", src: "/sounds/water-drop.mp3" },
  { id: "zen_chime", name: "Zen Chime", src: "/sounds/zen-chime.mp3" },
  { id: "triangle_chime", name: "Triangle Chime", src: "/sounds/triangle-chime.mp3" },
  { id: "meditation_bell", name: "Meditation Bell", src: "/sounds/meditation-bell.mp3" },
  { id: "deep_gong", name: "Deep Gong", src: "/sounds/deep-gong.mp3" },
  { id: "crystal_bowl", name: "Crystal Singing Bowl", src: "/sounds/crystal-bowl.mp3" },
  { id: "finger_cymbals", name: "Finger Cymbals", src: "/sounds/finger-cymbals.mp3" },
  { id: "wooden_block", name: "Wooden Block", src: "/sounds/wooden-block.mp3" },
  { id: "rainstick", name: "Rainstick", src: "/sounds/rainstick.mp3" },
  { id: "thunderstorm", name: "Distant Thunderstorm", src: "/sounds/thunderstorm.mp3" },
  { id: "mountain_stream", name: "Mountain Stream", src: "/sounds/mountain-stream.mp3" },
]

export const MUSICAL_NOTES = {
  octave4: [
    { id: "note_C4", name: "C4 Note", note: "C", octave: 4 },
    { id: "note_D4", name: "D4 Note", note: "D", octave: 4 },
    { id: "note_E4", name: "E4 Note", note: "E", octave: 4 },
    { id: "note_F4", name: "F4 Note", note: "F", octave: 4 },
    { id: "note_G4", name: "G4 Note", note: "G", octave: 4 },
    { id: "note_A4", name: "A4 Note", note: "A", octave: 4 },
    { id: "note_B4", name: "B4 Note", note: "B", octave: 4 },
  ],
  octave5: [
    { id: "note_C5", name: "C5 Note", note: "C", octave: 5 },
    { id: "note_D5", name: "D5 Note", note: "D", octave: 5 },
    { id: "note_E5", name: "E5 Note", note: "E", octave: 5 },
    { id: "note_F5", name: "F5 Note", note: "F", octave: 5 },
    { id: "note_G5", name: "G5 Note", note: "G", octave: 5 },
    { id: "note_A5", name: "A5 Note", note: "A", octave: 5 },
    { id: "note_B5", name: "B5 Note", note: "B", octave: 5 },
  ],
}

export const AMBIENT_SOUNDS_LIBRARY: AmbientSound[] = [
  { id: "ambient_rain", name: "Rain", src: "/sounds/ambient-rain.mp3", volume: 0.4 },
  { id: "ambient_forest", name: "Forest", src: "/sounds/ambient-forest.mp3", volume: 0.3 },
  { id: "ambient_ocean", name: "Ocean", src: "/sounds/ambient-ocean.mp3", volume: 0.5 },
  { id: "ambient_river", name: "River", src: "/sounds/ambient-river.mp3", volume: 0.4 },
  { id: "ambient_crickets", name: "Crickets", src: "/sounds/ambient-crickets.mp3", volume: 0.3 },
  { id: "ambient_fire", name: "Campfire", src: "/sounds/ambient-fire.mp3", volume: 0.3 },
  { id: "ambient_wind", name: "Wind", src: "/sounds/ambient-wind.mp3", volume: 0.2 },
  { id: "ambient_thunderstorm", name: "Thunderstorm", src: "/sounds/thunderstorm.mp3", volume: 0.5 },
  { id: "ambient_mountain_stream", name: "Mountain Stream", src: "/sounds/mountain-stream.mp3", volume: 0.4 },
]

/**
 * Generates a synthetic sound and plays it using the Web Audio API.
 * @param soundCue The sound cue object containing the synthetic sound ID.
 * @param audioContext The AudioContext to use for sound generation.
 */
export async function generateSyntheticSound(soundCue: SoundCue, audioContext: AudioContext | OfflineAudioContext) {
  if (!audioContext) {
    console.error("AudioContext is not provided.")
    return
  }

  const duration = 1.5 // seconds
  const sampleRate = audioContext.sampleRate
  const frameCount = sampleRate * duration
  const buffer = audioContext.createBuffer(1, frameCount, sampleRate)
  const channelData = buffer.getChannelData(0)

  switch (soundCue.src) {
    case "synthetic:soft_pad": {
      const frequency = 220 // A3
      const gain = 0.3
      for (let i = 0; i < frameCount; i++) {
        const time = i / sampleRate
        let value = Math.sin(2 * Math.PI * frequency * time) * gain
        // Apply a gentle attack and release
        if (time < 0.1) {
          value *= time / 0.1 // Attack
        } else if (time > duration - 0.5) {
          value *= (duration - time) / 0.5 // Release
        }
        channelData[i] = value
      }
      break
    }
    case "synthetic:gentle_swell": {
      const startFreq = 100
      const endFreq = 400
      const maxGain = 0.4
      for (let i = 0; i < frameCount; i++) {
        const time = i / sampleRate
        const frequency = startFreq + (endFreq - startFreq) * (time / duration)
        let gain = maxGain * Math.sin(Math.PI * (time / duration)) // Swell effect
        channelData[i] = Math.sin(2 * Math.PI * frequency * time) * gain
      }
      break
    }
    default:
      console.warn("Unknown synthetic sound ID:", soundCue.src)
      return
  }

  if (audioContext instanceof AudioContext) {
    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(audioContext.destination)
    source.start()
  } else if (audioContext instanceof OfflineAudioContext) {
    // For OfflineAudioContext, we don't play immediately, just create the source
    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(audioContext.destination)
    source.start(0) // Start at the beginning of the offline context
  }
}

/**
 * Generates an ambient sound and adds it to the given AudioContext.
 * This function is designed to be used with OfflineAudioContext for export.
 * @param sound The ambient sound object.
 * @param audioContext The AudioContext (or OfflineAudioContext) to add the sound to.
 * @param totalDuration The total duration of the meditation in seconds.
 * @param volume The volume for this ambient sound (0.0 to 1.0).
 */
export async function generateAmbientSound(
  sound: AmbientSound,
  audioContext: AudioContext | OfflineAudioContext,
  totalDuration: number,
  volume: number,
) {
  if (!audioContext) {
    console.error("AudioContext is not provided for ambient sound generation.")
    return
  }

  try {
    let audioBuffer: AudioBuffer

    if (sound.src.startsWith("synthetic:")) {
      // Generate synthetic ambient sound
      const sampleRate = audioContext.sampleRate
      const bufferDuration = Math.min(totalDuration, 60) // Generate max 60s for synthetic loop
      const frameCount = sampleRate * bufferDuration
      const tempBuffer = audioContext.createBuffer(1, frameCount, sampleRate)
      const channelData = tempBuffer.getChannelData(0)

      switch (sound.id) {
        case "ambient_rain": {
          // White noise with low-pass filter for rain effect
          const filter = audioContext.createBiquadFilter()
          filter.type = "lowpass"
          filter.frequency.setValueAtTime(1000, 0) // Cutoff at 1000 Hz
          filter.Q.setValueAtTime(1, 0)

          const whiteNoiseBuffer = audioContext.createBuffer(1, sampleRate * bufferDuration, sampleRate)
          const noiseData = whiteNoiseBuffer.getChannelData(0)
          for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = Math.random() * 2 - 1 // White noise
          }

          const noiseSource = audioContext.createBufferSource()
          noiseSource.buffer = whiteNoiseBuffer
          noiseSource.loop = true
          noiseSource.connect(filter)
          filter.connect(audioContext.destination) // Connect to destination for processing

          // To get the filtered audio into a buffer, we need to render it offline
          const offlineCtx = new OfflineAudioContext(1, sampleRate * bufferDuration, sampleRate)
          const offlineNoiseSource = offlineCtx.createBufferSource()
          offlineNoiseSource.buffer = whiteNoiseBuffer
          offlineNoiseSource.loop = true
          const offlineFilter = offlineCtx.createBiquadFilter()
          offlineFilter.type = "lowpass"
          offlineFilter.frequency.setValueAtTime(1000, 0)
          offlineFilter.Q.setValueAtTime(1, 0)
          offlineNoiseSource.connect(offlineFilter)
          offlineFilter.connect(offlineCtx.destination)
          offlineNoiseSource.start(0)
          audioBuffer = await offlineCtx.startRendering()
          break
        }
        case "ambient_wind": {
          // Pink noise simulation
          const b0 = 0,
            b1 = 0,
            b2 = 0,
            b3 = 0,
            b4 = 0,
            b5 = 0,
            b6 = 0
          for (let i = 0; i < frameCount; i++) {
            const white = Math.random() * 2 - 1
            b0 = 0.99886 * b0 + white * 0.0555179
            b1 = 0.99332 * b1 + white * 0.0750759
            b2 = 0.969 * b2 + white * 0.153852
            b3 = 0.8665 * b3 + white * 0.3104856
            b4 = 0.55 * b4 + white * 0.5329522
            b5 = -0.7616 * b5 + white * 0.016898
            channelData[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
            b6 = white * 0.115926
          }
          audioBuffer = tempBuffer
          break
        }
        default:
          console.warn("Unknown synthetic ambient sound ID:", sound.id)
          return
      }
    } else {
      // Load audio file
      const response = await fetch(sound.src)
      const arrayBuffer = await response.arrayBuffer()
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    }

    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.loop = true // Loop ambient sounds
    source.loopStart = 0
    source.loopEnd = audioBuffer.duration

    const gainNode = audioContext.createGain()
    source.connect(gainNode)
    gainNode.connect(audioContext.destination)

    gainNode.gain.setValueAtTime(volume, 0) // Set initial volume

    source.start(0) // Start at the beginning of the context
    if (audioContext instanceof OfflineAudioContext) {
      source.stop(totalDuration) // Stop at the end of the total meditation duration for offline rendering
    }
  } catch (error) {
    console.error(`Error generating/loading ambient sound ${sound.name}:`, error)
  }
}

export const generateNote = async (
  note: keyof typeof NOTE_FREQUENCIES,
  octave: number,
  audioContext: AudioContext | OfflineAudioContext,
) => {
  const frequency = NOTE_FREQUENCIES[`${note}${octave}` as keyof typeof NOTE_FREQUENCIES]
  if (!frequency) {
    console.error(`Frequency for note ${note}${octave} not found.`)
    return
  }

  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)

  const duration = 0.8 // seconds
  const peakVolume = 0.4

  gainNode.gain.setValueAtTime(0, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(peakVolume, audioContext.currentTime + 0.05)
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + duration)
}

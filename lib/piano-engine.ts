/**
 * Shared piano sampler.
 *
 * The sampler, its reverb and the in-flight load promise are module-level singletons on
 * purpose: loading the sample set is expensive, and both the home timeline and the Creator
 * play notes through it. Holding them here rather than in component state means the samples
 * survive navigation and are never loaded twice.
 *
 * Everything below is imperative audio work with no React involvement, which is why it lives
 * outside the page component.
 */

import * as Tone from "tone"
import { log } from "@/lib/log"

let sampler: Tone.Sampler | null = null
let reverb: Tone.Reverb | null = null
let isLoading = false
let isLoaded = false
let loadPianoPromise: Promise<void> | null = null

export const ensureTone = async () => {
  if (typeof window !== "undefined" && (window as any).Tone) {
    return (window as any).Tone
  }
  const mod = await import("tone")
  return mod
}

export const startPianoAudio = async () => {
  const Tone = await ensureTone()

  if (Tone.context.state === "closed") {
    log.debug("AudioContext is closed, creating new context...")
    const newContext = new AudioContext()
    await Tone.setContext(newContext)
    log.debug("New AudioContext created and set")
  }

  if (Tone.context.state !== "running") {
    log.debug("Starting Tone.js audio context...")
    try {
      await Tone.start()
      log.debug("AudioContext started successfully")
    } catch (error) {
      log.error("Error starting AudioContext:", error)
      const newContext = new AudioContext()
      await Tone.setContext(newContext)
      await Tone.start()
      log.debug("New AudioContext created and started after error")
    }
  }
}

export const loadPiano = async ({ wet = 0.18, decay = 2.8 } = {}) => {
  if (isLoaded && sampler) return

  if (loadPianoPromise) {
    await loadPianoPromise
    return
  }

  const ToneModule = await ensureTone()

  const loadPromise = async () => {
    isLoading = true

    await startPianoAudio()

    if (sampler) {
      try {
        sampler.dispose()
      } catch (e) {
        log.warn("Error disposing sampler:", e)
      }
      sampler = null
    }
    if (reverb) {
      try {
        reverb.dispose()
      } catch (e) {
        log.warn("Error disposing reverb:", e)
      }
      reverb = null
    }

    const createdReverb = new ToneModule.Reverb({ wet, decay, preDelay: 0.01 }).toDestination()
    await createdReverb.generate()

    const loadedSampler = new ToneModule.Sampler({
      urls: {
        A0: "A0.mp3",
        C1: "C1.mp3",
        "D#1": "Ds1.mp3",
        "F#1": "Fs1.mp3",
        A1: "A1.mp3",
        C2: "C2.mp3",
        "D#2": "Ds2.mp3",
        "F#2": "Fs2.mp3",
        A2: "A2.mp3",
        C3: "C3.mp3",
        "D#3": "Ds3.mp3",
        "F#3": "Fs3.mp3",
        A3: "A3.mp3",
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
        C5: "C5.mp3",
        "D#5": "Ds5.mp3",
        "F#5": "Fs5.mp3",
        A5: "A5.mp3",
        C6: "C6.mp3",
        "D#6": "Ds6.mp3",
        "F#6": "Fs6.mp3",
        A6: "A6.mp3",
        C7: "C7.mp3",
        "D#7": "Ds7.mp3",
        "F#7": "Fs7.mp3",
        A7: "A7.mp3",
        C8: "C8.mp3",
      },
      release: 1.2,
      baseUrl: "https://tonejs.github.io/audio/salamander/",
    }).connect(createdReverb)

    await ToneModule.loaded()

    reverb = createdReverb
    sampler = loadedSampler
    isLoaded = true
    log.debug("Piano sampler fully loaded and ready")
  }

  loadPianoPromise = loadPromise()

  try {
    await loadPianoPromise
  } catch (error) {
    log.error("Error loading piano:", error)
    isLoaded = false
    if (sampler) {
      try {
        sampler.dispose()
      } catch (e) {
        log.warn("Error disposing sampler after failure:", e)
      }
      sampler = null
    }
    if (reverb) {
      try {
        reverb.dispose()
      } catch (e) {
        log.warn("Error disposing reverb after failure:", e)
      }
      reverb = null
    }
    throw error
  } finally {
    isLoading = false
    loadPianoPromise = null
  }
}

export const playPianoNote = async (noteString: string, duration = 0.45, velocity = 0.9) => {
  try {
    await startPianoAudio()

    if (!isLoaded || !sampler || !sampler.loaded) {
      log.debug("Piano not loaded, initializing...")
      await loadPiano()
    }

    if (!sampler || !sampler.loaded) {
      throw new Error("Piano sampler is not loaded")
    }

    const Tone = await ensureTone()
    log.debug(`Playing piano note: ${noteString}`)
    const activeSampler = sampler
    if (!activeSampler) {
      throw new Error("Piano sampler reference unavailable")
    }
    activeSampler.triggerAttackRelease(noteString, duration, Tone.now(), velocity)
  } catch (error) {
    log.error("Error playing piano note:", error)
    // Don't reset isLoaded here to avoid constant reloading
    throw error
  }
}


/**
 * Loads the sampler if it isn't already, then hands it back ready to play — or null when it
 * could not be made ready. Callers that want to trigger notes themselves (chords, for
 * instance) should go through this rather than reaching for the module's internals.
 */
export const getLoadedPianoSampler = async (): Promise<Tone.Sampler | null> => {
  if (!sampler) {
    log.debug("Piano not loaded, initializing...")
    await loadPiano()
  }
  return sampler && isLoaded ? sampler : null
}

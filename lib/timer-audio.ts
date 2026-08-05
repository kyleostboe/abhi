/**
 * Bell synthesis and scheduling for the sit timer.
 *
 * Two things here matter more than the sound itself.
 *
 * First, bells are scheduled against the AudioContext clock, in advance, at absolute times. The
 * obvious implementation — a `setTimeout` per bell — does not survive the screen going off, which
 * is the normal condition for a sit rather than an edge case: background tabs have their timers
 * clamped to about one tick a second, and a locked phone may stop firing them entirely. The audio
 * clock keeps running and honours what was already scheduled on it.
 *
 * Second, a silent looping element is played for the duration of the sit. Browsers suspend an
 * AudioContext in a backgrounded tab unless the page is audibly playing something; a silent
 * element counts, and keeps the context alive so the scheduled bells actually ring.
 *
 * The bell is synthesised rather than sampled because there are no audio files in this project
 * yet, and a missing file is a silent timer that fails at the only moment it matters.
 */

import { log } from "@/lib/log"

/**
 * Inharmonic partials, roughly those of a struck bowl. A harmonic series sounds like an organ;
 * the stretched ratios are what make it read as a bell.
 */
const PARTIALS: { ratio: number; gain: number; decay: number }[] = [
  { ratio: 1, gain: 1, decay: 1 },
  { ratio: 2.0, gain: 0.6, decay: 0.8 },
  { ratio: 3.01, gain: 0.4, decay: 0.6 },
  { ratio: 4.17, gain: 0.25, decay: 0.45 },
  { ratio: 5.43, gain: 0.15, decay: 0.35 },
]

export type BellVoice = {
  id: string
  name: string
  frequency: number
  decaySeconds: number
}

export const BELL_VOICES: BellVoice[] = [
  { id: "bowl-low", name: "Low bowl", frequency: 210, decaySeconds: 9 },
  { id: "bowl", name: "Bowl", frequency: 320, decaySeconds: 7 },
  { id: "bell", name: "Bell", frequency: 480, decaySeconds: 5.5 },
  { id: "chime", name: "Chime", frequency: 720, decaySeconds: 4 },
]

export const DEFAULT_BELL_ID = "bowl"

export const bellVoiceById = (id: string | null | undefined): BellVoice =>
  BELL_VOICES.find((voice) => voice.id === id) ?? BELL_VOICES.find((voice) => voice.id === DEFAULT_BELL_ID)!

/** A 1-sample silent loop, as a data URI, for keeping the audio session alive while backgrounded. */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQQAAAAAAAAA"

export class TimerAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private scheduled: { stop: () => void }[] = []
  private keepAlive: HTMLAudioElement | null = null

  /** Must be called from a user gesture — browsers will not start an AudioContext otherwise. */
  async prepare(): Promise<boolean> {
    if (typeof window === "undefined") return false

    if (!this.context) {
      const AudioContextClass =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) {
        log.error("[timer] AudioContext is not supported in this browser")
        return false
      }
      this.context = new AudioContextClass()
      this.master = this.context.createGain()
      this.master.gain.value = 0.8
      this.master.connect(this.context.destination)
    }

    if (this.context.state === "suspended") {
      try {
        await this.context.resume()
      } catch (error) {
        log.error("[timer] Failed to resume AudioContext:", error)
        return false
      }
    }

    return true
  }

  setVolume(volume: number) {
    if (!this.master) return
    const clamped = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0.8
    this.master.gain.value = clamped
  }

  /** Seconds on the audio clock. Bell times are expressed relative to this. */
  now(): number {
    return this.context?.currentTime ?? 0
  }

  /**
   * Starts a silent loop so the browser treats the page as playing. Without it a backgrounded
   * tab can suspend the AudioContext and the sit finishes in silence.
   */
  startKeepAlive() {
    if (typeof window === "undefined" || this.keepAlive) return
    try {
      const element = new Audio(SILENT_WAV)
      element.loop = true
      element.volume = 0
      void element.play().catch((error) => log.debug("[timer] Keep-alive playback rejected:", error))
      this.keepAlive = element
    } catch (error) {
      log.debug("[timer] Could not start keep-alive audio:", error)
    }
  }

  stopKeepAlive() {
    if (!this.keepAlive) return
    this.keepAlive.pause()
    this.keepAlive.src = ""
    this.keepAlive = null
  }

  /** Schedules one bell at an absolute time on the audio clock. */
  scheduleBell(atContextTime: number, voice: BellVoice, gain = 1) {
    const context = this.context
    const master = this.master
    if (!context || !master) return

    const startAt = Math.max(atContextTime, context.currentTime)
    const decay = voice.decaySeconds

    for (const partial of PARTIALS) {
      const oscillator = context.createOscillator()
      const envelope = context.createGain()

      oscillator.type = "sine"
      oscillator.frequency.value = voice.frequency * partial.ratio

      const peak = 0.25 * partial.gain * gain
      const partialDecay = decay * partial.decay

      // A near-instant attack and an exponential tail. exponentialRampToValueAtTime cannot reach
      // zero, so it runs to a floor and the node is stopped after it.
      envelope.gain.setValueAtTime(0.0001, startAt)
      envelope.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), startAt + 0.004)
      envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + partialDecay)

      oscillator.connect(envelope)
      envelope.connect(master)

      oscillator.start(startAt)
      oscillator.stop(startAt + partialDecay + 0.1)

      const stop = () => {
        try {
          oscillator.stop()
        } catch {
          // Already stopped; nothing to do.
        }
        oscillator.disconnect()
        envelope.disconnect()
      }

      oscillator.onended = () => {
        this.scheduled = this.scheduled.filter((entry) => entry.stop !== stop)
        oscillator.disconnect()
        envelope.disconnect()
      }

      this.scheduled.push({ stop })
    }
  }

  /** Rings a bell immediately — used for previewing a voice in the settings UI. */
  async preview(voice: BellVoice) {
    if (!(await this.prepare())) return
    this.scheduleBell(this.now() + 0.02, voice)
  }

  /** Cancels every scheduled bell. Called when a sit is ended early. */
  cancelAll() {
    for (const entry of this.scheduled) entry.stop()
    this.scheduled = []
  }

  async dispose() {
    this.cancelAll()
    this.stopKeepAlive()
    if (this.context) {
      try {
        await this.context.close()
      } catch (error) {
        log.debug("[timer] Failed to close AudioContext:", error)
      }
      this.context = null
      this.master = null
    }
  }
}

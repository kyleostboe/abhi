/**
 * Where each meditation's audio actually is, and what to say when some of it is somewhere else.
 *
 * The row in Postgres is the index of everything an account has ever saved; `audio_key` says
 * whether the bytes are also in R2. Past the synced allowance they are not — they live in the
 * browser that made them and nowhere else — so an account opened on a second device sees its
 * whole library listed and can only play part of it.
 *
 * That is a reasonable trade for a free tier, but only if the app says so. A library that lists
 * forty-three meditations and silently fails to play twenty-eight of them reads as broken; one
 * that says "twenty-eight have their audio on your iPhone" reads as a thing you understand and
 * can act on. This module is the difference between those two, and it is pure so that the
 * arithmetic and the wording are both reachable by a test.
 */

export type MeditationAvailabilityInput = {
  id: string
  /** The processed audio is in R2, so it plays on any device. */
  hasAudioKey: boolean
  /** The processed audio is in this browser's cache. */
  hasLocalAudio: boolean
  /** Where it was last saved, for the rows whose audio never left that device. */
  deviceLabel?: string | null
}

export type LibraryAvailability = {
  total: number
  /** Playable right now, whether from R2 or the local cache. */
  playableHere: number
  /** Playable on any device, because the bytes are in R2. */
  synced: number
  /** Ids whose audio is neither here nor in R2. */
  elsewhere: string[]
  /** Distinct device labels among those, in first-seen order. Empty when none were recorded. */
  elsewhereDevices: string[]
}

export const summarizeAvailability = (
  items: MeditationAvailabilityInput[],
): LibraryAvailability => {
  const elsewhere: string[] = []
  const devices: string[] = []
  let playableHere = 0
  let synced = 0

  for (const item of items) {
    if (item.hasAudioKey) synced += 1

    if (item.hasAudioKey || item.hasLocalAudio) {
      playableHere += 1
      continue
    }

    elsewhere.push(item.id)
    const label = item.deviceLabel?.trim()
    if (label && !devices.includes(label)) devices.push(label)
  }

  return { total: items.length, playableHere, synced, elsewhere, elsewhereDevices: devices }
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`

/**
 * One sentence naming what cannot be played here, or null when everything can.
 *
 * Names the device when exactly one is responsible, because "on your iPhone" is a thing someone
 * can act on and "on another device" is a thing they have to go and work out. With several, the
 * list stops being useful faster than it stops being accurate, so it collapses.
 */
export const describeMissingAudio = (summary: LibraryAvailability): string | null => {
  const missing = summary.elsewhere.length
  if (missing === 0) return null

  const where =
    summary.elsewhereDevices.length === 1
      ? `on ${summary.elsewhereDevices[0]}`
      : summary.elsewhereDevices.length > 1
        ? "on your other devices"
        : "on another device"

  return `${plural(missing, "meditation")} ${missing === 1 ? "has its" : "have their"} audio ${where}.`
}

/**
 * Whether to put the missing-audio notice in front of someone.
 *
 * Not on a single absent file: one meditation left on an old laptop is ordinary, and a banner
 * about it is noise. The notice is for the case it was written for — arriving on a new device and
 * finding most of the library silent — so it needs either a real proportion of the library to be
 * missing or enough of it in absolute terms to be disorienting.
 */
export const MISSING_AUDIO_NOTICE_MIN_COUNT = 3
export const MISSING_AUDIO_NOTICE_MIN_SHARE = 0.25

export const shouldShowMissingAudioNotice = (summary: LibraryAvailability): boolean => {
  const missing = summary.elsewhere.length
  if (missing < MISSING_AUDIO_NOTICE_MIN_COUNT) return false
  if (summary.total === 0) return false
  return missing / summary.total >= MISSING_AUDIO_NOTICE_MIN_SHARE
}

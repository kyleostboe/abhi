"use client"

import { MeditationLibrary, type Playlist, type SavedMeditation } from "@/lib/meditation-library"
import { createClient } from "@/lib/supabase/client"
import { createResource } from "@/lib/data-cache"
import { type JournalFolder, type JournalNote, loadJournalData } from "@/lib/journal-notes-query"
import { loadSessionRows } from "@/lib/sessions-query"
import type { PracticeSession } from "@/lib/sessions"
import { DEFAULT_USER_SETTINGS, type UserSettings, normalizeSettings } from "@/lib/user-settings"
import { log } from "@/lib/log"

/**
 * Everything the app shows, warmed once and held in module memory.
 *
 * The lists and the metadata, deliberately, and not the note bodies or the audio: a note's
 * markdown lives in R2 and is fetched when the note is opened, which is already the right
 * arrangement and is not what a swipe waits on. What a swipe waited on was the index — nine
 * queries and one presign batch, a handful of rows — and having those in hand before the page
 * renders is the whole of the fix.
 *
 * `components/data-warmer.tsx` fills these; pages read them synchronously with `peek()` and then
 * revalidate. Nothing here is allowed to be the only copy of anything: every page still owns its
 * own state and mirrors it back, so a cache miss is a slower render and never a wrong one.
 */

/**
 * How long a snapshot is served without a refetch.
 *
 * Five minutes, sized against the shortest-lived thing in the payload: the presigned R2 playback
 * URLs on every meditation, which expire an hour after they are minted
 * (`DOWNLOAD_URL_EXPIRY_SECONDS`, lib/storage.ts). Well inside that, and long enough that moving
 * between the three pages never refetches. Pages revalidate on mount regardless — this only
 * governs what a bare `load()` does.
 */
const STALE_MS = 5 * 60 * 1000

/** The signed-in user, or null. Read from the client's own in-memory session after the first call. */
async function currentUserId(): Promise<string | null> {
  const { data } = await createClient().auth.getSession()
  return data.session?.user?.id ?? null
}

export const meditationsResource = createResource<SavedMeditation[]>({ staleMs: STALE_MS }, () =>
  MeditationLibrary.getAllMeditations(),
)

export const recordingsResource = createResource<SavedMeditation[]>({ staleMs: STALE_MS }, () =>
  MeditationLibrary.getRecordings(),
)

export const playlistsResource = createResource<Playlist[]>({ staleMs: STALE_MS }, () =>
  MeditationLibrary.getAllPlaylists(),
)

/**
 * Each playlist's contents, keyed by playlist id.
 *
 * One resource rather than one per playlist because it is always read as a whole — the Library
 * renders every playlist's count — and because a map is what the page already holds.
 */
export const playlistMeditationsResource = createResource<Record<string, SavedMeditation[]>>(
  { staleMs: STALE_MS },
  async () => {
    const playlists = await playlistsResource.load()
    const entries = await Promise.all(
      playlists.map(async (playlist) => {
        const meditations = await MeditationLibrary.getPlaylistMeditations(playlist.id)
        return [playlist.id, meditations] as [string, SavedMeditation[]]
      }),
    )
    return Object.fromEntries(entries)
  },
)

export const storageUsageResource = createResource<{ usedBytes: number; quotaBytes?: number }>(
  { staleMs: STALE_MS },
  () => MeditationLibrary.getStorageUsage(),
)

export const journalResource = createResource<{ notes: JournalNote[]; folders: JournalFolder[] }>(
  { staleMs: STALE_MS },
  async () => {
    if (!(await currentUserId())) return { notes: [], folders: [] }
    return loadJournalData(createClient())
  },
)

export const sessionsResource = createResource<PracticeSession[]>({ staleMs: STALE_MS }, async () => {
  const userId = await currentUserId()
  if (!userId) return []
  return loadSessionRows(createClient(), userId)
})

export const userSettingsResource = createResource<UserSettings>({ staleMs: STALE_MS }, async () => {
  const userId = await currentUserId()
  if (!userId) return DEFAULT_USER_SETTINGS
  const { data, error } = await createClient()
    .from("user_settings")
    .select("settings")
    .eq("profile_id", userId)
    .maybeSingle()
  if (error) {
    log.error("[settings] Failed to load settings:", error)
    return DEFAULT_USER_SETTINGS
  }
  return normalizeSettings(data?.settings)
})

/** Every resource, for warming and for clearing. */
const ALL = [
  meditationsResource,
  recordingsResource,
  playlistsResource,
  playlistMeditationsResource,
  storageUsageResource,
  journalResource,
  sessionsResource,
  userSettingsResource,
]

/** Signing out must not leave one account's library peekable by the next person at this browser. */
export function clearAppData(): void {
  for (const resource of ALL) resource.clear()
}

/**
 * The payload a page needs to render complete, on the first frame.
 *
 * Split from the rest because these are what a swipe lands on, and because the remainder — the
 * per-playlist fan-out and the storage total — are a request per playlist plus a bucket scan, and
 * have no business competing with the first paint.
 */
export const FIRST_PAINT_RESOURCES = [
  meditationsResource,
  recordingsResource,
  playlistsResource,
  journalResource,
  sessionsResource,
  userSettingsResource,
]

export const DEFERRED_RESOURCES = [playlistMeditationsResource, storageUsageResource]

import { type SessionNoteDraft, parseSessionNoteDraft } from "@/lib/journal-draft"
import { log } from "@/lib/log"

// The sit that just finished, held between the player and the Journal.
//
// localStorage rather than a query param because the offer has to survive the walk from wherever
// the sit happened to wherever the writing happens — including a refresh, or opening the Journal
// from the nav instead of the prompt. It holds one draft: a newer sit replaces an older offer
// rather than queueing behind it, since nobody wants to be asked about a sit from yesterday.

const KEY = "abhi_session_note_draft"

export function saveSessionNoteDraft(draft: SessionNoteDraft): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft))
  } catch (error) {
    log.warn("[journal] Unable to stash the session note draft:", error)
  }
}

export function getSessionNoteDraft(): SessionNoteDraft | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    return parseSessionNoteDraft(JSON.parse(raw))
  } catch (error) {
    log.warn("[journal] Unable to read the session note draft:", error)
    return null
  }
}

export function clearSessionNoteDraft(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch (error) {
    log.warn("[journal] Unable to clear the session note draft:", error)
  }
}

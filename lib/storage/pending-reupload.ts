import { saveAudioRecord, getAudioRecord, deleteAudioRecord } from "./indexed-db"

// When a guest reuploads a new file over an already-loaded Adjuster meditation and chooses
// "create account & keep both", we can't save anything yet (no account) and don't want to
// encode/process the new file before we even know they'll finish signing up. So we stash just
// the new file's bytes here and send them to sign-up; the currently-loaded file survives the
// redirect on its own via the existing tool-draft autosave. On return, the caller re-opens the
// Save dialog for the (now-restored) old file, then loads this stashed file once that save
// completes.

const META_KEY = "abhi_pending_reupload"
const RECORD_ID = "__pending_reupload_file__"

// Only needs to survive a single working session (the sign-up redirect round-trip).
const TTL_MS = 4 * 60 * 60 * 1000 // 4 hours

type PendingReuploadMeta = { fileName: string; fileType: string; savedAt: number }

export async function savePendingReuploadFile(file: File): Promise<void> {
  await saveAudioRecord({ id: RECORD_ID, processedAudio: file })
  const meta: PendingReuploadMeta = { fileName: file.name, fileType: file.type, savedAt: Date.now() }
  window.localStorage.setItem(META_KEY, JSON.stringify(meta))
}

export async function getPendingReuploadFile(): Promise<File | null> {
  const raw = window.localStorage.getItem(META_KEY)
  if (!raw) return null

  try {
    const meta = JSON.parse(raw) as PendingReuploadMeta
    if (Date.now() - meta.savedAt > TTL_MS) {
      await clearPendingReuploadFile()
      return null
    }
    const record = await getAudioRecord(RECORD_ID)
    if (!record?.processedAudio) return null
    return new File([record.processedAudio], meta.fileName, { type: meta.fileType })
  } catch (error) {
    console.warn("[v0] Unable to read pending reupload file:", error)
    return null
  }
}

export async function clearPendingReuploadFile(): Promise<void> {
  window.localStorage.removeItem(META_KEY)
  await deleteAudioRecord(RECORD_ID).catch(() => {})
}

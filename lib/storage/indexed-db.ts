const DB_NAME = "abhi-audio"
const DB_VERSION = 1
const AUDIO_STORE = "meditation-audio"

export type SerializedBlob = { data: string; type: string }

export type AudioRecord = {
  id: string
  processedAudio: Blob
  sourceAudio?: Blob | null
  timelineRecordings?: Record<string, Blob>
}

type StoredAudioRecord = {
  id: string
  processedAudio: SerializedBlob
  sourceAudio?: SerializedBlob | null
  timelineRecordings?: Record<string, SerializedBlob>
}

export type AudioBackup = {
  id: string
  processedAudio?: SerializedBlob | null
  sourceAudio?: SerializedBlob | null
  timelineRecordings?: Record<string, SerializedBlob>
}

const toBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

const fromBase64 = (value: string) => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function serializeBlob(blob?: Blob | null): Promise<SerializedBlob | null> {
  if (!blob) return Promise.resolve(null)
  return blob
    .arrayBuffer()
    .then((buffer) => ({ data: toBase64(buffer), type: blob.type }))
}

function deserializeBlob(serialized?: SerializedBlob | null): Blob | null {
  if (!serialized) return null
  const buffer = fromBase64(serialized.data)
  return new Blob([buffer], { type: serialized.type })
}

function getDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this environment."))
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: "id" })
      }
    }

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

export async function saveAudioRecord(record: AudioRecord): Promise<void> {
  console.log("[v0] IndexedDB saveAudioRecord called for ID:", record.id)
  console.log("[v0] Audio sizes - processed:", record.processedAudio?.size, "source:", record.sourceAudio?.size, "timeline:", Object.keys(record.timelineRecordings || {}).length)
  
  const storedRecord: StoredAudioRecord = {
    id: record.id,
    processedAudio: (await serializeBlob(record.processedAudio))!,
    sourceAudio: await serializeBlob(record.sourceAudio ?? null),
    timelineRecordings: {},
  }

  if (record.timelineRecordings) {
    for (const [key, blob] of Object.entries(record.timelineRecordings)) {
      const serialized = await serializeBlob(blob)
      if (serialized) {
        storedRecord.timelineRecordings![key] = serialized
      }
    }
  }

  console.log("[v0] Serialized audio data, now storing in IndexedDB...")
  
  const db = await getDatabase()
  console.log("[v0] IndexedDB database opened successfully")
  
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, "readwrite")
    const store = transaction.objectStore(AUDIO_STORE)
    const request = store.put(storedRecord)
    
    request.onsuccess = () => {
      console.log("[v0] IndexedDB put operation successful for ID:", record.id)
    }
    
    request.onerror = () => {
      console.error("[v0] IndexedDB put operation failed:", request.error)
    }
    
    transaction.oncomplete = () => {
      console.log("[v0] IndexedDB transaction completed for ID:", record.id)
      resolve()
    }
    
    transaction.onerror = () => {
      console.error("[v0] IndexedDB transaction failed:", transaction.error)
      reject(transaction.error)
    }
  })
}

export async function getAudioRecord(id: string): Promise<AudioRecord | null> {
  console.log("[v0] IndexedDB getAudioRecord called for ID:", id)
  
  const db = await getDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, "readonly")
    const store = transaction.objectStore(AUDIO_STORE)
    const request = store.get(id)
    
    request.onsuccess = () => {
      const stored = request.result as StoredAudioRecord | undefined
      if (!stored) {
        console.log("[v0] IndexedDB no audio record found for ID:", id)
        resolve(null)
        return
      }
      
      const timelineRecordings: Record<string, Blob> = {}
      if (stored.timelineRecordings) {
        for (const [key, serialized] of Object.entries(stored.timelineRecordings)) {
          const blob = deserializeBlob(serialized)
          if (blob) {
            timelineRecordings[key] = blob
          }
        }
      }
      
      const record: AudioRecord = {
        id: stored.id,
        processedAudio: deserializeBlob(stored.processedAudio)!,
        sourceAudio: deserializeBlob(stored.sourceAudio ?? null),
        timelineRecordings: Object.keys(timelineRecordings).length > 0 ? timelineRecordings : undefined,
      }
      
      console.log("[v0] IndexedDB found audio record for ID:", id, "sizes - processed:", record.processedAudio?.size, "source:", record.sourceAudio?.size)
      resolve(record)
    }
    
    request.onerror = () => {
      console.error("[v0] IndexedDB get operation failed:", request.error)
      reject(request.error)
    }
  })
}

export async function deleteAudioRecord(id: string): Promise<void> {
  const db = await getDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, "readwrite")
    const store = transaction.objectStore(AUDIO_STORE)
    store.delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function exportAudioRecords(ids: string[]): Promise<AudioBackup[]> {
  const backups: AudioBackup[] = []

  for (const id of ids) {
    try {
      const record = await getAudioRecord(id)
      if (!record) continue
      const serialized: AudioBackup = {
        id,
        processedAudio: await serializeBlob(record.processedAudio),
        sourceAudio: await serializeBlob(record.sourceAudio ?? null),
        timelineRecordings: {},
      }

      if (record.timelineRecordings) {
        for (const [eventId, blob] of Object.entries(record.timelineRecordings)) {
          serialized.timelineRecordings![eventId] = (await serializeBlob(blob)) as SerializedBlob
        }
      }

      backups.push(serialized)
    } catch (error) {
      console.warn("Unable to export audio record", id, error)
    }
  }

  return backups
}

export async function importAudioBackups(backups: AudioBackup[]): Promise<void> {
  for (const backup of backups) {
    try {
      const timelineRecordings: Record<string, Blob> = {}
      if (backup.timelineRecordings) {
        Object.entries(backup.timelineRecordings).forEach(([eventId, serialized]) => {
          const blob = deserializeBlob(serialized)
          if (blob) {
            timelineRecordings[eventId] = blob
          }
        })
      }

      await saveAudioRecord({
        id: backup.id,
        processedAudio: (deserializeBlob(backup.processedAudio) as Blob) ?? new Blob(),
        sourceAudio: deserializeBlob(backup.sourceAudio),
        timelineRecordings,
      })
    } catch (error) {
      console.warn("Unable to import audio backup", backup.id, error)
    }
  }
}

export async function estimateAudioUsage(): Promise<{ usedBytes: number; quotaBytes?: number }> {
  try {
    const db = await getDatabase()
    return await new Promise<{ usedBytes: number; quotaBytes?: number }>((resolve) => {
      const transaction = db.transaction(AUDIO_STORE, "readonly")
      const store = transaction.objectStore(AUDIO_STORE)
      const request = store.getAll()
      request.onsuccess = () => {
        const storedRecords = request.result as StoredAudioRecord[]
        console.log("[v0] Calculating storage for", storedRecords.length, "audio records")
        
        const usedBytes = storedRecords.reduce((total, stored) => {
          let next = total
          if (stored.processedAudio) {
            const blob = deserializeBlob(stored.processedAudio)
            if (blob) next += blob.size
          }
          if (stored.sourceAudio) {
            const blob = deserializeBlob(stored.sourceAudio)
            if (blob) next += blob.size
          }
          if (stored.timelineRecordings) {
            Object.values(stored.timelineRecordings).forEach((serialized) => {
              const blob = deserializeBlob(serialized)
              if (blob) next += blob.size
            })
          }
          return next
        }, 0)
        
        console.log("[v0] Total audio storage:", usedBytes, "bytes")
        resolve({ usedBytes })
      }
      request.onerror = () => resolve({ usedBytes: 0 })
    })
  } catch (error) {
    console.warn("[v0] Unable to estimate audio usage", error)
    return { usedBytes: 0 }
  }
}

import { log } from "@/lib/log"
const DB_NAME = "abhi-audio"
const DB_VERSION = 1
const AUDIO_STORE = "meditation-audio"

export type AudioRecord = {
  id: string
  processedAudio: Blob
  sourceAudio?: Blob | null
  timelineRecordings?: Record<string, Blob>
}

export type SerializedBlob = {
  data: string
  type: string
}

export type AudioBackup = {
  id: string
  processedAudio?: SerializedBlob | null
  sourceAudio?: SerializedBlob | null
  timelineRecordings?: Record<string, SerializedBlob>
}

function getDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this environment."))
  }

  return new Promise((resolve, reject) => {
    log.debug("IndexedDB: Opening database:", DB_NAME)
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      log.debug("IndexedDB: Database upgrade needed")
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: "id" })
        log.debug("IndexedDB: Created object store:", AUDIO_STORE)
      }
    }

    request.onerror = () => {
      log.error("IndexedDB: Failed to open database:", request.error)
      reject(request.error)
    }
    
    request.onsuccess = () => {
      log.debug("IndexedDB: Database opened successfully")
      resolve(request.result)
    }
  })
}

export async function saveAudioRecord(record: AudioRecord): Promise<void> {
  log.debug("IndexedDB saveAudioRecord called for ID:", record.id)
  log.debug("Audio sizes - processed:", record.processedAudio?.size, "source:", record.sourceAudio?.size, "timeline:", Object.keys(record.timelineRecordings || {}).length)
  
  const db = await getDatabase()
  
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, "readwrite")
    const store = transaction.objectStore(AUDIO_STORE)
    
    const request = store.put(record)
    
    request.onsuccess = () => {
      log.debug("IndexedDB: Put operation successful for ID:", record.id)
    }
    
    request.onerror = () => {
      log.error("IndexedDB: Put operation failed:", request.error)
      reject(request.error)
    }
    
    transaction.oncomplete = () => {
      log.debug("IndexedDB: Transaction completed successfully for ID:", record.id)
      resolve()
    }
    
    transaction.onerror = () => {
      log.error("IndexedDB: Transaction failed:", transaction.error)
      reject(transaction.error)
    }
    
    transaction.onabort = () => {
      log.error("IndexedDB: Transaction aborted")
      reject(new Error("Transaction aborted"))
    }
  })
}

export async function getAudioRecord(id: string): Promise<AudioRecord | null> {
  log.debug("IndexedDB getAudioRecord called for ID:", id)
  
  const db = await getDatabase()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, "readonly")
    const store = transaction.objectStore(AUDIO_STORE)
    const request = store.get(id)
    
    request.onsuccess = () => {
      const record = request.result as AudioRecord | undefined
      if (!record) {
        log.debug("IndexedDB: No audio record found for ID:", id)
        resolve(null)
        return
      }
      
      log.debug("IndexedDB: Found audio record for ID:", id, "processed size:", record.processedAudio?.size, "source size:", record.sourceAudio?.size)
      resolve(record)
    }
    
    request.onerror = () => {
      log.error("IndexedDB: Get operation failed:", request.error)
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
      
      const processedSerialized = await serializeBlob(record.processedAudio)
      const sourceSerialized = record.sourceAudio ? await serializeBlob(record.sourceAudio) : null
      
      const timelineRecordings: Record<string, SerializedBlob> = {}
      if (record.timelineRecordings) {
        for (const [key, blob] of Object.entries(record.timelineRecordings)) {
          const serialized = await serializeBlob(blob)
          if (serialized) {
            timelineRecordings[key] = serialized
          }
        }
      }
      
      backups.push({
        id,
        processedAudio: processedSerialized,
        sourceAudio: sourceSerialized,
        timelineRecordings: Object.keys(timelineRecordings).length > 0 ? timelineRecordings : undefined,
      })
    } catch (error) {
      log.warn("Unable to export audio record", id, error)
    }
  }

  return backups
}

export async function importAudioBackups(backups: AudioBackup[]): Promise<void> {
  for (const backup of backups) {
    try {
      // deserializeBlob returns null on a corrupt payload, so fall through to the same empty
      // blob used when the backup carries no processed audio at all. An AudioRecord's
      // processedAudio is non-nullable; writing null here surfaced later as a crash on read.
      const processedAudio = (backup.processedAudio ? deserializeBlob(backup.processedAudio) : null) ?? new Blob()
      const sourceAudio = backup.sourceAudio ? deserializeBlob(backup.sourceAudio) : null
      
      const timelineRecordings: Record<string, Blob> = {}
      if (backup.timelineRecordings) {
        for (const [key, serialized] of Object.entries(backup.timelineRecordings)) {
          const blob = deserializeBlob(serialized)
          if (blob) {
            timelineRecordings[key] = blob
          }
        }
      }
      
      await saveAudioRecord({
        id: backup.id,
        processedAudio,
        sourceAudio,
        timelineRecordings: Object.keys(timelineRecordings).length > 0 ? timelineRecordings : undefined,
      })
    } catch (error) {
      log.warn("Unable to import audio backup", backup.id, error)
    }
  }
}

async function serializeBlob(blob: Blob): Promise<SerializedBlob | null> {
  if (!blob) return null
  try {
    const buffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ""
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return { data: btoa(binary), type: blob.type }
  } catch (error) {
    log.error("Failed to serialize blob:", error)
    return null
  }
}

function deserializeBlob(serialized: SerializedBlob): Blob | null {
  if (!serialized || !serialized.data) return null
  try {
    const binary = atob(serialized.data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new Blob([bytes], { type: serialized.type || 'audio/wav' })
  } catch (error) {
    log.error("Failed to deserialize blob:", error)
    return null
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
        const records = request.result as AudioRecord[]
        log.debug("Calculating storage for", records.length, "audio records")
        
        const usedBytes = records.reduce((total, record) => {
          let next = total
          if (record.processedAudio) next += record.processedAudio.size
          if (record.sourceAudio) next += record.sourceAudio.size
          if (record.timelineRecordings) {
            Object.values(record.timelineRecordings).forEach((blob) => {
              if (blob) next += blob.size
            })
          }
          return next
        }, 0)
        
        log.debug("Total audio storage:", usedBytes, "bytes")
        resolve({ usedBytes })
      }
      
      request.onerror = () => {
        log.error("Failed to get all records:", request.error)
        resolve({ usedBytes: 0 })
      }
    })
  } catch (error) {
    log.warn("Unable to estimate audio usage", error)
    return { usedBytes: 0 }
  }
}

export async function getAllAudioRecords(): Promise<AudioRecord[]> {
  const db = await getDatabase()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, "readonly")
    const store = transaction.objectStore(AUDIO_STORE)
    const request = store.getAll()
    
    request.onsuccess = () => {
      resolve(request.result as AudioRecord[])
    }
    
    request.onerror = () => {
      reject(request.error)
    }
  })
}

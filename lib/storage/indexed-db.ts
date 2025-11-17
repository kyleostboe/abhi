const DB_NAME = "abhi-audio"
const DB_VERSION = 1
const AUDIO_STORE = "meditation-audio"

export type AudioRecord = {
  id: string
  processedAudio: Blob
  sourceAudio?: Blob | null
  timelineRecordings?: Record<string, Blob>
}

export type AudioBackup = {
  id: string
  processedAudio?: Blob | null
  sourceAudio?: Blob | null
  timelineRecordings?: Record<string, Blob>
}

function getDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this environment."))
  }

  return new Promise((resolve, reject) => {
    console.log("[v0] IndexedDB: Opening database:", DB_NAME)
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      console.log("[v0] IndexedDB: Database upgrade needed")
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE, { keyPath: "id" })
        console.log("[v0] IndexedDB: Created object store:", AUDIO_STORE)
      }
    }

    request.onerror = () => {
      console.error("[v0] IndexedDB: Failed to open database:", request.error)
      reject(request.error)
    }
    
    request.onsuccess = () => {
      console.log("[v0] IndexedDB: Database opened successfully")
      resolve(request.result)
    }
  })
}

export async function saveAudioRecord(record: AudioRecord): Promise<void> {
  console.log("[v0] IndexedDB saveAudioRecord called for ID:", record.id)
  console.log("[v0] Audio sizes - processed:", record.processedAudio?.size, "source:", record.sourceAudio?.size, "timeline:", Object.keys(record.timelineRecordings || {}).length)
  
  const db = await getDatabase()
  
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(AUDIO_STORE, "readwrite")
    const store = transaction.objectStore(AUDIO_STORE)
    
    const request = store.put(record)
    
    request.onsuccess = () => {
      console.log("[v0] IndexedDB: Put operation successful for ID:", record.id)
    }
    
    request.onerror = () => {
      console.error("[v0] IndexedDB: Put operation failed:", request.error)
      reject(request.error)
    }
    
    transaction.oncomplete = () => {
      console.log("[v0] IndexedDB: Transaction completed successfully for ID:", record.id)
      resolve()
    }
    
    transaction.onerror = () => {
      console.error("[v0] IndexedDB: Transaction failed:", transaction.error)
      reject(transaction.error)
    }
    
    transaction.onabort = () => {
      console.error("[v0] IndexedDB: Transaction aborted")
      reject(new Error("Transaction aborted"))
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
      const record = request.result as AudioRecord | undefined
      if (!record) {
        console.log("[v0] IndexedDB: No audio record found for ID:", id)
        resolve(null)
        return
      }
      
      console.log("[v0] IndexedDB: Found audio record for ID:", id, "processed size:", record.processedAudio?.size, "source size:", record.sourceAudio?.size)
      resolve(record)
    }
    
    request.onerror = () => {
      console.error("[v0] IndexedDB: Get operation failed:", request.error)
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
      
      backups.push({
        id,
        processedAudio: record.processedAudio,
        sourceAudio: record.sourceAudio ?? null,
        timelineRecordings: record.timelineRecordings,
      })
    } catch (error) {
      console.warn("Unable to export audio record", id, error)
    }
  }

  return backups
}

export async function importAudioBackups(backups: AudioBackup[]): Promise<void> {
  for (const backup of backups) {
    try {
      await saveAudioRecord({
        id: backup.id,
        processedAudio: backup.processedAudio ?? new Blob(),
        sourceAudio: backup.sourceAudio,
        timelineRecordings: backup.timelineRecordings,
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
        const records = request.result as AudioRecord[]
        console.log("[v0] Calculating storage for", records.length, "audio records")
        
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
        
        console.log("[v0] Total audio storage:", usedBytes, "bytes")
        resolve({ usedBytes })
      }
      
      request.onerror = () => {
        console.error("[v0] Failed to get all records:", request.error)
        resolve({ usedBytes: 0 })
      }
    })
  } catch (error) {
    console.warn("[v0] Unable to estimate audio usage", error)
    return { usedBytes: 0 }
  }
}

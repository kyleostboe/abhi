"use client"

import { log } from "@/lib/log"

/**
 * Asking the browser not to evict what is only here.
 *
 * IndexedDB is not durable by default. Safari clears script-writable storage after about seven
 * days without a visit, Chrome evicts under disk pressure, and clearing browsing data takes it
 * everywhere. For a library whose audio past the synced allowance exists in exactly one place,
 * that is the difference between a free tier and a slow leak.
 *
 * `navigator.storage.persist()` is the one lever available, and it is a request rather than a
 * setting: Chrome usually grants it to an installed or frequently-visited site, Firefox may
 * prompt, Safari largely ties it to being on the home screen. So this is best-effort by nature —
 * the answer feeds `shouldPromptForBackup`, which asks sooner when the answer was no, rather than
 * being treated anywhere as a guarantee.
 */

/** Whether storage is already persistent. False when the API is missing or throws. */
export const isStoragePersisted = async (): Promise<boolean> => {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.persisted) return false
    return await navigator.storage.persisted()
  } catch (error) {
    log.warn("[storage] Could not read the persistence state:", error)
    return false
  }
}

/**
 * Requests persistent storage, returning whether it is persistent afterwards.
 *
 * Checks first because a granted request is permanent and re-requesting can re-prompt in browsers
 * that ask — being nagged about storage permission is its own version of the problem this is
 * meant to avoid.
 */
export const requestPersistentStorage = async (): Promise<boolean> => {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) return false
    if (await isStoragePersisted()) return true

    const granted = await navigator.storage.persist()
    log.debug("[storage] Persistent storage request:", granted ? "granted" : "declined")
    return granted
  } catch (error) {
    log.warn("[storage] Could not request persistent storage:", error)
    return false
  }
}

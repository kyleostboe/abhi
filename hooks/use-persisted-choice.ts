"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * A switch/tab selection that survives leaving a page and coming back — which swiping between
 * pages (components/swipe-navigator.tsx) makes constant — and that several components can share.
 *
 * Three layers, each solving a different problem:
 *
 * - **Module memory.** A client-side navigation swaps the page component but doesn't re-evaluate
 *   this module, so the last choice is still here when you return. That's what makes the restore
 *   instant, with no frame of the default tab showing first.
 * - **Subscribers.** The switch now lives in the app shell (rendered by the layout, so it isn't
 *   rebuilt on navigation) while the page body that reacts to it lives in the route. They're in
 *   different trees, so a shared key has to notify every holder rather than rely on one owning
 *   the state.
 * - **sessionStorage.** A full reload clears module memory, so the choice is mirrored there too.
 *   It's read in an effect rather than in the initialiser, so the first client render still
 *   matches the server's HTML.
 *
 * Stored values are validated against `allowed` on the way in: sessionStorage is arbitrary
 * user-writable text, and a stale key from an older build shouldn't be able to put the UI into a
 * tab that no longer exists.
 */
const memory = new Map<string, string>()
const listeners = new Map<string, Set<(value: string) => void>>()

const storageKey = (key: string) => `abhi_ui_choice:${key}`

function subscribe(key: string, listener: (value: string) => void) {
  let set = listeners.get(key)
  if (!set) {
    set = new Set()
    listeners.set(key, set)
  }
  set.add(listener)
  return () => {
    set?.delete(listener)
  }
}

function publish(key: string, value: string) {
  memory.set(key, value)
  try {
    sessionStorage.setItem(storageKey(key), value)
  } catch {
    /* storage unavailable — module memory still covers navigation within this load */
  }
  listeners.get(key)?.forEach((listener) => listener(value))
}

/**
 * The stored choice, read synchronously. For code that has to agree with where the hook is about
 * to land without waiting on its restore effect.
 */
export function readPersistedChoice<T extends string>(key: string, allowed: readonly T[]): T | null {
  const inList = (raw: unknown): raw is T => typeof raw === "string" && (allowed as readonly string[]).includes(raw)
  const fromMemory = memory.get(key)
  if (inList(fromMemory)) return fromMemory
  try {
    const stored = sessionStorage.getItem(storageKey(key))
    return inList(stored) ? stored : null
  } catch {
    return null
  }
}

export function usePersistedChoice<T extends string>(
  key: string,
  allowed: readonly T[],
  defaultValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const allowedRef = useRef(allowed)
  allowedRef.current = allowed

  const validate = (raw: unknown): T | null =>
    typeof raw === "string" && (allowedRef.current as readonly string[]).includes(raw) ? (raw as T) : null

  const [value, setValue] = useState<T>(() => validate(memory.get(key)) ?? defaultValue)

  // Stay in step with every other holder of this key, wherever it lives in the tree.
  useEffect(() => subscribe(key, (next) => {
    const valid = validate(next)
    if (valid) setValue(valid)
  }), [key])

  // Cold module memory means this is a fresh page load, so fall back to sessionStorage.
  useEffect(() => {
    if (memory.has(key)) return
    let stored: T | null = null
    try {
      stored = validate(sessionStorage.getItem(storageKey(key)))
    } catch {
      /* storage unavailable — the default stands */
    }
    memory.set(key, stored ?? value)
    if (stored) setValue(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Writing happens here rather than in an effect on `value`. An effect would also fire on mount,
  // writing the default over the stored choice before the restore above could read it — which is
  // exactly the bug that used to send a reload back to the first tab.
  const latest = useRef(value)
  latest.current = value

  const set = useCallback<React.Dispatch<React.SetStateAction<T>>>(
    (next) => {
      const current = validate(memory.get(key)) ?? latest.current
      const resolved = typeof next === "function" ? (next as (p: T) => T)(current) : next
      publish(key, resolved)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )

  return [value, set]
}

/**
 * The same three layers for a value with no fixed list of options — a selected note's id, a
 * folder's id, which pane a two-pane layout is showing.
 *
 * `parse` is to this what `allowed` is to `usePersistedChoice`: sessionStorage is arbitrary
 * user-writable text and a stale key from an older build should not be able to put the UI into a
 * state that no longer exists. It returns `undefined` for anything unusable, and the default
 * stands instead.
 *
 * The stored form is always a string, which is all sessionStorage holds. A `null` value is stored
 * as the empty string, so "nothing is selected" survives a navigation as itself rather than
 * springing back to the default.
 *
 * What it cannot check is whether an id still refers to something — the notes have not loaded yet
 * when this restores. That check belongs to the caller, against the list it just loaded.
 */
export function usePersistedValue<T extends string | null>(
  key: string,
  parse: (raw: string) => T | undefined,
  defaultValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const parseRef = useRef(parse)
  parseRef.current = parse

  const defaultRef = useRef(defaultValue)
  defaultRef.current = defaultValue

  const read = (raw: string | null | undefined): T | undefined =>
    typeof raw === "string" ? parseRef.current(raw) : undefined

  const [value, setValue] = useState<T>(() => read(memory.get(key)) ?? defaultValue)

  // Stay in step with every other holder of this key, wherever it lives in the tree.
  useEffect(() => subscribe(key, (next) => setValue(read(next) ?? defaultRef.current)), [key])

  // Cold module memory means this is a fresh page load, so fall back to sessionStorage.
  useEffect(() => {
    if (memory.has(key)) return
    let stored: T | undefined
    try {
      stored = read(sessionStorage.getItem(storageKey(key)))
    } catch {
      /* storage unavailable — the default stands */
    }
    // `value` here is the first render's, which is the right one to seed memory with.
    memory.set(key, stored ?? value ?? "")
    if (stored !== undefined) setValue(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Written here rather than in an effect on `value`, for the reason `usePersistedChoice` gives:
  // an effect would also fire on mount and write the default over the stored value.
  const latest = useRef(value)
  latest.current = value

  const set = useCallback<React.Dispatch<React.SetStateAction<T>>>(
    (next) => {
      const current = read(memory.get(key)) ?? latest.current
      const resolved = typeof next === "function" ? (next as (p: T) => T)(current) : next
      publish(key, resolved ?? "")
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )

  return [value, set]
}

/** The same persistence and cross-tree syncing for an on/off state. */
export function usePersistedFlag(
  key: string,
  defaultValue = false,
): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
  const [raw, setRaw] = usePersistedChoice(key, ["on", "off"] as const, defaultValue ? "on" : "off")
  const set = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(
    (next) => {
      setRaw((prev) => {
        const resolved = typeof next === "function" ? (next as (p: boolean) => boolean)(prev === "on") : next
        return resolved ? "on" : "off"
      })
    },
    [setRaw],
  )
  return [raw === "on", set]
}

"use client"

import { useEffect, useRef, useState } from "react"

import { type DebouncedSave, createDebouncedSave } from "@/lib/debounced-save"

/**
 * A debounced save tied to a component's life, which **flushes when the component goes away**
 * rather than dropping what was pending.
 *
 * That is the whole point. Both hand-rolled versions this replaces cleared their timer on unmount,
 * so the last edit before leaving was lost — and a swipe between pages unmounts the page it
 * leaves. Unmount is the right hook rather than an "about to navigate" signal from the swipe
 * navigator, because unmount covers every way of leaving: the gesture, a nav tab, the back button,
 * a link out.
 *
 * `save` is read through a ref, so the latest closure is always the one that runs — including from
 * the unmount flush, where the component's own state is on its way out.
 */
export function useDebouncedSave(save: () => void | Promise<void>, delayMs: number): DebouncedSave {
  const saveRef = useRef(save)
  saveRef.current = save

  // One instance for the life of the component: `schedule` is called from effects that re-run on
  // every edit, and a new debouncer each time would never reach its own deadline.
  const [saver] = useState(() => createDebouncedSave(delayMs, () => saveRef.current()))

  useEffect(() => {
    return () => {
      // Deliberately not awaited. The promise outlives the component, which is fine: both callers
      // are fire-and-forget writes (IndexedDB, one Supabase update) and neither needs to put
      // anything back on screen afterwards.
      void saver.flush()
    }
  }, [saver])

  return saver
}

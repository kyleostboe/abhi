/**
 * A debounced save that runs when it is interrupted instead of being thrown away.
 *
 * The app had two hand-rolled versions of this and both were wrong in the same way: the pending
 * `setTimeout` was cleared on unmount rather than run. So the last edit before leaving a page —
 * the 800ms window on the Home tools, the 900ms window in the Journal's note editor — was dropped,
 * and leaving a page is exactly what a swipe does. In the Journal that meant losing words someone
 * had typed.
 *
 * The debounce itself is still wanted: dragging a slider or typing a sentence should not hammer
 * IndexedDB or Supabase once per keystroke. What changes is only what happens at the end.
 *
 * Kept free of React so it can be tested directly; `hooks/use-debounced-save.ts` is the wrapper
 * that ties `flush` to a component going away.
 */
export interface DebouncedSave {
  /** Start (or restart) the clock. The save runs `delayMs` after the last call. */
  schedule(): void
  /** Run a pending save now. Does nothing if none is pending. Resolves when the save does. */
  flush(): Promise<void>
  /** Drop a pending save without running it. For work that is being deliberately discarded. */
  cancel(): void
  /** Whether a save is waiting on the clock. */
  isPending(): boolean
}

export function createDebouncedSave(delayMs: number, save: () => void | Promise<void>): DebouncedSave {
  let timer: ReturnType<typeof setTimeout> | null = null

  const run = (): Promise<void> => {
    timer = null
    return Promise.resolve(save()).then(() => undefined)
  }

  return {
    schedule() {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        void run()
      }, delayMs)
    },

    flush() {
      if (!timer) return Promise.resolve()
      clearTimeout(timer)
      return run()
    },

    cancel() {
      if (!timer) return
      clearTimeout(timer)
      timer = null
    },

    isPending() {
      return timer !== null
    },
  }
}

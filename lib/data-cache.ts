/**
 * The smallest cache that makes a page render complete on its first frame.
 *
 * The problem it solves is specific. Every page fetched its own data in a mount effect, so a swipe
 * to the Library or the Journal landed on a spinner for a measured 330-1005ms — long after the
 * 260ms slide had finished, which is what "the page content doesn't load until after the swipes"
 * meant. The fix is not a faster fetch; it is having the answer already, in memory, before the
 * page is asked to render.
 *
 * Three layers, the same shape `hooks/use-persisted-choice.ts` uses for UI choices and for the
 * same reason:
 *
 * - **Module memory.** A client-side navigation swaps the page component but does not re-evaluate
 *   this module, so the last snapshot is still here when you come back.
 * - **`peek()`, synchronous.** That is the load-bearing part: it can be called from a `useState`
 *   initialiser, which is what lets a returning page render its real content in its first frame
 *   rather than a loading state it then replaces.
 * - **Subscribers.** A resource is read by pages in different trees (a hook in the Journal, the
 *   warmer in the layout), so a change has to notify every holder rather than rely on one owning
 *   it.
 *
 * Stale-while-revalidate rather than a TTL that blocks: a stale snapshot is still shown, and the
 * refresh lands underneath it. Nothing here ever makes the caller wait for data it already has.
 */

export interface Resource<T> {
  /** The snapshot, synchronously, or `undefined` if nothing has ever loaded. Safe during render. */
  peek(): T | undefined
  /** Fresh data, fetching only if the snapshot is missing or stale. Concurrent calls share one. */
  load(): Promise<T>
  /** Fetch regardless of freshness. The snapshot stays readable throughout. */
  refresh(): Promise<T>
  /** Overwrite the snapshot — for a mutation whose result the caller already knows. */
  set(value: T): void
  /** Forget what was loaded and when, without clearing the snapshot's freshness for readers. */
  invalidate(): void
  /** Drop everything. For signing out. */
  clear(): void
  /** Called on every change to the snapshot. Returns an unsubscribe. */
  subscribe(listener: (value: T) => void): () => void
}

export interface ResourceOptions {
  /** How long a snapshot is treated as fresh. Past this, `load()` refetches — but still returns
   *  the stale value to `peek()` in the meantime. */
  staleMs: number
}

export function createResource<T>({ staleMs }: ResourceOptions, loader: () => Promise<T>): Resource<T> {
  let snapshot: T | undefined
  let loadedAt = 0
  let inFlight: Promise<T> | null = null
  const listeners = new Set<(value: T) => void>()

  const publish = (value: T) => {
    snapshot = value
    loadedAt = Date.now()
    for (const listener of [...listeners]) listener(value)
  }

  const fetchOnce = (): Promise<T> => {
    // One request, however many callers: the warmer and the page it warmed for start within a
    // frame of each other, and two identical round trips is the cost this whole module exists to
    // avoid.
    if (inFlight) return inFlight
    const request = loader()
      .then((value) => {
        publish(value)
        return value
      })
      .finally(() => {
        if (inFlight === request) inFlight = null
      })
    inFlight = request
    return request
  }

  return {
    peek: () => snapshot,

    load: () => {
      const isFresh = snapshot !== undefined && Date.now() - loadedAt < staleMs
      if (isFresh) return Promise.resolve(snapshot as T)
      return fetchOnce()
    },

    refresh: () => fetchOnce(),

    set: (value: T) => {
      publish(value)
    },

    invalidate: () => {
      loadedAt = 0
    },

    clear: () => {
      snapshot = undefined
      loadedAt = 0
      inFlight = null
    },

    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

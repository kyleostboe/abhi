import { describe, expect, it, vi } from "vitest"

import { createResource } from "./data-cache"

/** A loader whose resolution the test controls, so "in flight" is a state a test can sit in. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe("createResource", () => {
  it("has nothing to peek at before anything is loaded", () => {
    const resource = createResource({ staleMs: 1000 }, async () => 1)
    expect(resource.peek()).toBeUndefined()
  })

  it("makes the loaded value peekable — the whole point, since peek runs during render", async () => {
    const resource = createResource({ staleMs: 1000 }, async () => "loaded")
    await resource.load()
    expect(resource.peek()).toBe("loaded")
  })

  it("dedupes concurrent loads into one request", async () => {
    const gate = deferred<number>()
    const loader = vi.fn(() => gate.promise)
    const resource = createResource({ staleMs: 1000 }, loader)

    const first = resource.load()
    const second = resource.load()
    gate.resolve(7)

    expect(await first).toBe(7)
    expect(await second).toBe(7)
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it("serves a fresh snapshot without going back to the loader", async () => {
    const loader = vi.fn(async () => "value")
    const resource = createResource({ staleMs: 10_000 }, loader)

    await resource.load()
    await resource.load()

    expect(loader).toHaveBeenCalledTimes(1)
  })

  it("refetches once the snapshot is stale", async () => {
    vi.useFakeTimers()
    try {
      let n = 0
      const loader = vi.fn(async () => ++n)
      const resource = createResource({ staleMs: 1000 }, loader)

      expect(await resource.load()).toBe(1)
      vi.setSystemTime(Date.now() + 2000)
      expect(await resource.load()).toBe(2)
      expect(loader).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it("refresh goes to the loader even when the snapshot is fresh", async () => {
    let n = 0
    const loader = vi.fn(async () => ++n)
    const resource = createResource({ staleMs: 10_000 }, loader)

    await resource.load()
    expect(await resource.refresh()).toBe(2)
  })

  it("keeps the last good value when a refresh fails", async () => {
    let shouldFail = false
    const resource = createResource({ staleMs: 0 }, async () => {
      if (shouldFail) throw new Error("offline")
      return "good"
    })

    await resource.load()
    shouldFail = true
    await expect(resource.load()).rejects.toThrow("offline")

    // A failed revalidation must not blank the page that is already showing the old data.
    expect(resource.peek()).toBe("good")
  })

  it("recovers after a failure rather than caching the rejection", async () => {
    let shouldFail = true
    const resource = createResource({ staleMs: 0 }, async () => {
      if (shouldFail) throw new Error("offline")
      return "good"
    })

    await expect(resource.load()).rejects.toThrow("offline")
    shouldFail = false
    expect(await resource.load()).toBe("good")
  })

  it("notifies subscribers on load and on set", async () => {
    const resource = createResource({ staleMs: 1000 }, async () => "first")
    const seen: string[] = []
    resource.subscribe((value) => seen.push(value))

    await resource.load()
    resource.set("second")

    expect(seen).toEqual(["first", "second"])
  })

  it("stops notifying after unsubscribe", async () => {
    const resource = createResource({ staleMs: 1000 }, async () => "value")
    const seen: string[] = []
    const unsubscribe = resource.subscribe((value) => seen.push(value))

    unsubscribe()
    await resource.load()

    expect(seen).toEqual([])
  })

  it("survives a subscriber that unsubscribes from inside its own callback", async () => {
    const resource = createResource({ staleMs: 1000 }, async () => "value")
    const seen: string[] = []
    const unsubscribe = resource.subscribe((value) => {
      seen.push(value)
      unsubscribe()
    })
    resource.subscribe((value) => seen.push(`also ${value}`))

    await resource.load()

    expect(seen).toEqual(["value", "also value"])
  })

  it("set makes the value peekable without a load", () => {
    const resource = createResource({ staleMs: 1000 }, async () => "loaded")
    resource.set("written")
    expect(resource.peek()).toBe("written")
  })

  it("set counts as fresh, so a mutation is not immediately refetched over", async () => {
    const loader = vi.fn(async () => "loaded")
    const resource = createResource({ staleMs: 10_000 }, loader)

    resource.set("written")
    expect(await resource.load()).toBe("written")
    expect(loader).not.toHaveBeenCalled()
  })

  it("invalidate keeps the snapshot readable but makes the next load refetch", async () => {
    let n = 0
    const loader = vi.fn(async () => ++n)
    const resource = createResource({ staleMs: 10_000 }, loader)

    await resource.load()
    resource.invalidate()

    // Still showable — this is what stops an invalidation flashing a spinner.
    expect(resource.peek()).toBe(1)
    expect(await resource.load()).toBe(2)
  })

  it("clear forgets everything, as signing out must", async () => {
    const resource = createResource({ staleMs: 10_000 }, async () => "someone's data")
    await resource.load()

    resource.clear()

    expect(resource.peek()).toBeUndefined()
  })
})

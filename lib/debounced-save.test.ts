import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createDebouncedSave } from "./debounced-save"

describe("createDebouncedSave", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("does not save until the clock runs out", () => {
    const save = vi.fn()
    const saver = createDebouncedSave(800, save)

    saver.schedule()
    vi.advanceTimersByTime(799)
    expect(save).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it("coalesces a burst of changes into one save", () => {
    const save = vi.fn()
    const saver = createDebouncedSave(800, save)

    for (let i = 0; i < 10; i++) {
      saver.schedule()
      vi.advanceTimersByTime(100)
    }
    vi.advanceTimersByTime(800)

    expect(save).toHaveBeenCalledTimes(1)
  })

  it("flushes a pending save — the whole reason this exists", async () => {
    const save = vi.fn()
    const saver = createDebouncedSave(800, save)

    saver.schedule()
    vi.advanceTimersByTime(100)
    await saver.flush()

    expect(save).toHaveBeenCalledTimes(1)
  })

  it("does not save on flush when nothing is pending", async () => {
    const save = vi.fn()
    const saver = createDebouncedSave(800, save)

    await saver.flush()

    expect(save).not.toHaveBeenCalled()
  })

  it("does not save twice when a flush is followed by the clock running out", async () => {
    const save = vi.fn()
    const saver = createDebouncedSave(800, save)

    saver.schedule()
    await saver.flush()
    vi.advanceTimersByTime(5000)

    expect(save).toHaveBeenCalledTimes(1)
  })

  it("cancel drops the pending save", () => {
    const save = vi.fn()
    const saver = createDebouncedSave(800, save)

    saver.schedule()
    saver.cancel()
    vi.advanceTimersByTime(5000)

    expect(save).not.toHaveBeenCalled()
  })

  it("reports whether a save is pending", async () => {
    const saver = createDebouncedSave(800, () => {})

    expect(saver.isPending()).toBe(false)
    saver.schedule()
    expect(saver.isPending()).toBe(true)
    await saver.flush()
    expect(saver.isPending()).toBe(false)
  })

  it("stops being pending once the clock has run out on its own", () => {
    const saver = createDebouncedSave(800, () => {})

    saver.schedule()
    vi.advanceTimersByTime(800)

    expect(saver.isPending()).toBe(false)
  })

  it("resolves flush only once an async save has finished", async () => {
    const order: string[] = []
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const saver = createDebouncedSave(800, async () => {
      order.push("saving")
      await gate
      order.push("saved")
    })

    saver.schedule()
    const flushed = saver.flush().then(() => order.push("flush resolved"))
    release()
    await flushed

    expect(order).toEqual(["saving", "saved", "flush resolved"])
  })

  it("can be scheduled again after a flush", async () => {
    const save = vi.fn()
    const saver = createDebouncedSave(800, save)

    saver.schedule()
    await saver.flush()
    saver.schedule()
    vi.advanceTimersByTime(800)

    expect(save).toHaveBeenCalledTimes(2)
  })
})

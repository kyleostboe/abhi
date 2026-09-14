import { beforeEach, describe, expect, it, vi } from "vitest"

// The job only exists to outlive a page, so the library itself is stubbed: what is under test is
// the state that survives, not the zipping.
const exportBackup = vi.fn<
  (onProgress?: (progress: number, message: string) => void) => Promise<{ blob: Blob; report: unknown }>
>()
const importBackup = vi.fn<(file: File, onProgress?: (progress: number, message: string) => void) => Promise<void>>()

vi.mock("@/lib/meditation-library", () => ({
  MeditationLibrary: {
    exportBackup: (onProgress?: (progress: number, message: string) => void) => exportBackup(onProgress),
    importBackup: (file: File, onProgress?: (progress: number, message: string) => void) =>
      importBackup(file, onProgress),
  },
}))

const { getBackupJobState, isBackupRunning, runImport, subscribeToBackupJob } = await import("./backup-job")

describe("the backup job", () => {
  beforeEach(() => {
    exportBackup.mockReset()
    importBackup.mockReset()
  })

  it("is idle to begin with", () => {
    expect(getBackupJobState()).toEqual({ kind: null, progress: null })
    expect(isBackupRunning()).toBe(false)
  })

  it("reports an import as running, with its progress, while it runs", async () => {
    const seen: string[] = []
    importBackup.mockImplementation(async (_file, onProgress) => {
      // Mid-job: this is the state a page arriving by swipe would seed itself from.
      expect(isBackupRunning()).toBe(true)
      onProgress?.(40, "Restoring audio")
      seen.push(`${getBackupJobState().progress?.progress} ${getBackupJobState().progress?.message}`)
    })

    await runImport(new File([], "backup.zip"))

    expect(seen).toEqual(["40 Restoring audio"])
  })

  it("returns to idle when the import finishes", async () => {
    importBackup.mockResolvedValue(undefined)
    await runImport(new File([], "backup.zip"))
    expect(getBackupJobState()).toEqual({ kind: null, progress: null })
  })

  it("returns to idle when the import fails, rather than showing progress for ever", async () => {
    importBackup.mockRejectedValue(new Error("not a zip"))
    await expect(runImport(new File([], "backup.zip"))).rejects.toThrow("not a zip")
    expect(isBackupRunning()).toBe(false)
  })

  it("declines a second job while one is running — they would fight over the same rows", async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    importBackup.mockImplementation(() => gate)

    const first = runImport(new File([], "one.zip"))
    await runImport(new File([], "two.zip"))
    expect(importBackup).toHaveBeenCalledTimes(1)

    release()
    await first
  })

  it("tells subscribers about every change, and stops when they unsubscribe", async () => {
    const seen: (string | null)[] = []
    const unsubscribe = subscribeToBackupJob((state) => seen.push(state.kind))
    importBackup.mockResolvedValue(undefined)

    await runImport(new File([], "backup.zip"))
    unsubscribe()
    await runImport(new File([], "backup.zip"))

    expect(seen).toEqual(["import", null])
  })
})

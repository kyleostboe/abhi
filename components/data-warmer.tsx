"use client"

import { useEffect } from "react"

import { useAuth } from "@/hooks/use-auth"
import { DEFERRED_RESOURCES, FIRST_PAINT_RESOURCES, clearAppData } from "@/lib/app-data"
import { log } from "@/lib/log"

/**
 * Loads the whole app's index as soon as there is an account to load it for.
 *
 * Rendered from `app/layout.tsx`, so it outlives every navigation and runs exactly once per
 * sign-in rather than once per page. By the time a swipe reaches the Library or the Journal the
 * answer is already in `lib/app-data.ts`, and the page renders complete instead of mounting a
 * spinner and fetching for another 330-1005ms.
 *
 * It renders nothing. It is a side effect with a place in the tree, which is the cheapest way to
 * get "when auth resolves" without a provider.
 */
export function DataWarmer() {
  const { isAuthenticated, userId } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      // Signing out has to drop the snapshots, or the next person at this browser can peek at the
      // last one's library before their own empty state arrives.
      clearAppData()
      return
    }

    // Errors are the resource's business — a failed warm leaves the snapshot empty and the page
    // falls back to fetching for itself, which is exactly what it did before any of this.
    for (const resource of FIRST_PAINT_RESOURCES) {
      void resource.load().catch((error) => log.warn("[warm] resource failed:", error))
    }

    // The per-playlist fan-out is one request per playlist and the storage total is a bucket
    // scan. Neither is on the path of any first frame, so they wait for the browser to be idle
    // rather than competing with one.
    const hasIdleCallback = "requestIdleCallback" in window
    const idle = hasIdleCallback ? window.requestIdleCallback(warmDeferred) : window.setTimeout(warmDeferred, 1200)

    return () => {
      if (hasIdleCallback) window.cancelIdleCallback(idle)
      else window.clearTimeout(idle)
    }
  }, [isAuthenticated, userId])

  return null
}

function warmDeferred() {
  for (const resource of DEFERRED_RESOURCES) {
    void resource.load().catch((error) => log.warn("[warm] deferred resource failed:", error))
  }
}

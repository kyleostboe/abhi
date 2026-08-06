"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { log } from "@/lib/log"
import {
  DEFAULT_USER_SETTINGS,
  type DeepPartial,
  type UserSettings,
  mergeSettings,
  normalizeSettings,
} from "@/lib/user-settings"

/**
 * Reads and writes the `user_settings` row, which had existed unused since migration 010.
 *
 * Signed-out users get the defaults and cannot change them. That is deliberate rather than a
 * limitation: preferences that only live in one browser are the thing this replaces, and there is
 * no local library left for them to belong to.
 *
 * Updates apply optimistically and roll back on failure. A preference is never worth blocking
 * the UI for, but it is worth not lying about having saved.
 */
export function useUserSettings() {
  const supabase = useMemo(() => createClient(), [])
  const { isAuthenticated, userId } = useAuth()
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const settingsRef = useRef(settings)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setSettings(DEFAULT_USER_SETTINGS)
      setIsLoading(false)
      return
    }

    let isActive = true
    setIsLoading(true)

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("user_settings")
          .select("settings")
          .eq("profile_id", userId)
          .maybeSingle()

        if (!isActive) return

        if (error) {
          log.error("[settings] Failed to load settings:", error)
          setSettings(DEFAULT_USER_SETTINGS)
          return
        }

        setSettings(normalizeSettings(data?.settings))
      } catch (error) {
        if (isActive) {
          log.error("[settings] Unexpected error loading settings:", error)
          setSettings(DEFAULT_USER_SETTINGS)
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    void load()

    return () => {
      isActive = false
    }
  }, [supabase, isAuthenticated, userId])

  const updateSettings = useCallback(
    async (patch: DeepPartial<UserSettings>): Promise<boolean> => {
      if (!isAuthenticated || !userId) return false

      const previous = settingsRef.current
      const next = mergeSettings(previous, patch)
      setSettings(next)

      // Upsert rather than update: the row is created lazily, on the first preference anyone
      // actually changes, so an account that never opens Settings never gets one.
      const { error } = await supabase
        .from("user_settings")
        .upsert({ profile_id: userId, settings: next, updated_at: new Date().toISOString() }, {
          onConflict: "profile_id",
        })

      if (error) {
        log.error("[settings] Failed to save settings:", error)
        setSettings(previous)
        return false
      }

      return true
    },
    [supabase, isAuthenticated, userId],
  )

  return { settings, isLoading, updateSettings, canEdit: isAuthenticated }
}

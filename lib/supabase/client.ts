import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { log } from "@/lib/log"
import { createMockClient } from "@/lib/supabase/mock"

let cachedBrowserClient: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    if (process.env.NODE_ENV === "development") {
      log.debug("Supabase env vars missing. Using fallback mock client.")
    }
    return createMockClient()
  }

  if (typeof window !== "undefined") {
    if (!cachedBrowserClient) {
      cachedBrowserClient = createBrowserClient(url, key, {
        cookieOptions: {
          sameSite: "none",
          secure: true,
        },
      })
    }
    return cachedBrowserClient
  }

  return createBrowserClient(url, key)
}

/**
 * Returns Authorization header with the user's active session token, if available.
 * Useful for authenticated fetch calls to /api/* routes that may run inside an iframe.
 */
export async function getAuthHeader(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {}
  try {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` }
    }
  } catch (error) {
    log.debug("Failed to retrieve auth token for request header:", error)
  }
  return {}
}


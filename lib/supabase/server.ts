import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { createMockClient } from "@/lib/supabase/mock"

export async function createClient(request?: Request): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    return createMockClient()
  }

  const authHeader = request?.headers.get("authorization")
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim()

  let cookieStore: any = null
  try {
    cookieStore = await cookies()
  } catch {
    // cookies() can throw if called in an unsupported context
  }

  return createServerClient(url, key, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    cookies: {
      getAll() {
        return cookieStore?.getAll() ?? []
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore?.set(name, value, options))
        } catch {
          // The "setAll" method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

/**
 * Resolves the authenticated user from either the Authorization: Bearer <token>
 * header or the Supabase session cookies. This ensures authentication succeeds
 * reliably even inside cross-origin iframes where third-party cookies are blocked.
 */
export async function getAuthenticatedUser(
  request?: Request,
): Promise<{ user: User | null; supabase: SupabaseClient; error?: any }> {
  const supabase = await createClient(request)

  const authHeader = request?.headers.get("authorization")
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim()

  if (token) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)
    if (user && !error) {
      return { user, supabase }
    }
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  return { user: user ?? null, supabase, error }
}

/**
 * Creates an admin client with service_role privileges if SUPABASE_SERVICE_ROLE_KEY
 * is provided. Returns null if not configured.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return null
  }

  return createServerClient(url, serviceKey, {
    cookies: {
      getAll() {
        return []
      },
      setAll() {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}


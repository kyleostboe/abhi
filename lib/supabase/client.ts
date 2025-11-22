import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn("[v0] Supabase env vars missing. Client creation skipped.")
    // Return a dummy client or throw a handled error? 
    // createBrowserClient throws if args are missing.
    // We'll return a proxy that logs warnings or just let it fail gracefully later.
    // For now, let's try to return a minimal object that won't crash immediately,
    // but requests will fail.
    try {
      return createBrowserClient(url || "", key || "")
    } catch (e) {
      console.error("[v0] Failed to create Supabase client:", e)
      // Return a mock to prevent crash
      return {
        from: () => ({ select: () => ({ data: null, error: { message: "Supabase not configured" } }) }),
        auth: {
          getSession: async () => ({ data: { session: null } }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signOut: async () => {},
        },
      } as any
    }
  }

  return createBrowserClient(url, key)
}

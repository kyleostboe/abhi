import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Creates a chainable dummy query builder that safely resolves to empty data
 * when Supabase environment credentials are not provided.
 */
function createMockQueryBuilder() {
  const result = { data: null, error: null, count: null }

  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (val: unknown) => unknown) => Promise.resolve(resolve(result))
      }
      if (prop === "catch") {
        return () => Promise.resolve(result)
      }
      if (prop === "finally") {
        return (cb: () => void) => {
          try {
            cb()
          } catch {
            // ignore
          }
          return Promise.resolve(result)
        }
      }
      if (prop === "data") return null
      if (prop === "error") return null
      return () => new Proxy(() => {}, handler)
    },
    apply() {
      return new Proxy(() => {}, handler)
    },
  }

  return new Proxy(() => {}, handler)
}

/**
 * Fallback Supabase client used when NEXT_PUBLIC_SUPABASE_URL or
 * NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured. Prevents runtime
 * crashes on pages and tools that can run without an account.
 */
export function createMockClient(): SupabaseClient {
  return {
    from: () => createMockQueryBuilder(),
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: new Error("Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."),
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: new Error("Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."),
      }),
      resetPasswordForEmail: async () => ({
        data: null,
        error: new Error("Supabase is not configured."),
      }),
      updateUser: async () => ({
        data: { user: null },
        error: new Error("Supabase is not configured."),
      }),
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: new Error("Supabase is not configured.") }),
        download: async () => ({ data: null, error: new Error("Supabase is not configured.") }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
  } as unknown as SupabaseClient
}

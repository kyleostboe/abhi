import { createClient as createSupabaseClient } from "@supabase/supabase-js"

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL or Anon Key is missing. Please check your environment variables.")
    // Return a mock client to prevent crashes during development if env vars are missing.
    // In a production environment, you might want to throw an error or handle this more gracefully.
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: new Error("Supabase client not configured") }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ error: new Error("Supabase client not configured") }),
        signUp: async () => ({ error: new Error("Supabase client not configured") }),
        signOut: async () => ({ error: new Error("Supabase client not configured") }),
      },
      from: () => ({
        insert: () => ({ select: () => ({ data: null, error: new Error("Supabase client not configured") }) }),
        select: () => ({ eq: () => ({ data: null, error: new Error("Supabase client not configured") }) }),
      }),
    } as any // Cast to any to satisfy type checking for the mock
  }

  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey)
  return supabaseInstance
}

// Export the client instance directly for convenience, ensuring it's always the singleton.
export const supabase = createClient()

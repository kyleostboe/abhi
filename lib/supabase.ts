import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL or Anon Key is missing. Please check your environment variables.")
    // In a real application, you might want to throw an error or handle this more gracefully.
    // For now, we'll return a client that will likely fail on operations.
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

  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}

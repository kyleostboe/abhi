import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/types" // Assuming your database types are in lib/types.ts

// Create a singleton pattern for the client-side Supabase client
// This prevents multiple instances from being created, which can cause issues.
let supabase: ReturnType<typeof createBrowserClient<Database>> | undefined

export function getClientSupabase() {
  if (!supabase) {
    supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return supabase
}

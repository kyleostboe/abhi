import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/lib/types" // Assuming your database types are in lib/types.ts

export function getServerSupabase() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `cookies().set()` method can throw if called from a Server Component
            // that has already sent its response. If this is the case, you may
            // want to consider using a different approach for managing cookies.
            // For example, you can set cookies in a Server Action or a Route Handler.
            console.warn("Could not set cookie from Server Component:", error)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options })
          } catch (error) {
            console.warn("Could not remove cookie from Server Component:", error)
          }
        },
      },
    },
  )
}

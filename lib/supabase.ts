import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Supabase environment variables are not set. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured.",
  )
  // In a production application, you might want to throw an error or disable Supabase features
  // if these are not set, to prevent unexpected behavior.
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!)

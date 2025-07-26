import { createClient } from "@supabase/supabase-js"

// Ensure these environment variables are set in your .env.local or Vercel project settings
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.")
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.")
}

// Create a single Supabase client for the whole application
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

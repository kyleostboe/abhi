import { createBrowserClient } from "@supabase/supabase-js"

// Create a single Supabase client for the client-side
// This uses the singleton pattern to ensure only one client is created
// and re-used across the application.
const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default supabase

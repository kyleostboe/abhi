import { createClient } from "@/lib/supabase/client"

// Test profile ID that will be used until authentication is implemented
export const TEST_PROFILE_ID = "00000000-0000-0000-0000-000000000001"

export interface Profile {
  id: string
  email: string | null
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  createdAt: Date
  updatedAt: Date
}

let profileEnsured = false

export async function ensureTestProfile(): Promise<void> {
  // Only check once per session to avoid unnecessary database calls
  if (profileEnsured) {
    return
  }

  try {
    const supabase = createClient()

    // Try to insert the test profile, ignore if it already exists
    const { error } = await supabase.from("profiles").upsert(
      {
        id: TEST_PROFILE_ID,
        email: "test@example.com",
        username: "test_user",
        display_name: "Test User",
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
        ignoreDuplicates: true,
      },
    )

    if (error && error.code !== "23505") {
      // 23505 is duplicate key error, which is fine
      console.error("[v0] Error ensuring test profile:", error)
    } else {
      profileEnsured = true
    }
  } catch (error) {
    console.error("[v0] Error in ensureTestProfile:", error)
  }
}

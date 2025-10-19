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
  console.log("[v0] ensureTestProfile called, profileEnsured:", profileEnsured)

  // Only check once per session to avoid unnecessary database calls
  if (profileEnsured) {
    console.log("[v0] Profile already ensured, skipping")
    return
  }

  try {
    const supabase = createClient()

    console.log("[v0] Attempting to upsert test profile:", TEST_PROFILE_ID)

    // Try to insert the test profile, ignore if it already exists
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
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
      .select()

    if (error) {
      console.error("[v0] Error upserting test profile:", error)
      // Don't throw - the profile might already exist
      // Instead, verify it exists
    } else {
      console.log("[v0] Upsert successful, data:", data)
    }

    // Verify the profile exists
    const { data: existingProfile, error: selectError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", TEST_PROFILE_ID)
      .single()

    if (selectError || !existingProfile) {
      console.error("[v0] Profile verification failed:", selectError)
      throw new Error(
        `Test profile does not exist and could not be created: ${selectError?.message || "Unknown error"}`,
      )
    }

    console.log("[v0] Profile verified to exist:", existingProfile.id)
    profileEnsured = true
  } catch (error) {
    console.error("[v0] Error in ensureTestProfile:", error)
    throw error
  }
}

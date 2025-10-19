"use server"

import { createClient } from "@/lib/supabase/server"

const TEST_PROFILE_ID = "00000000-0000-0000-0000-000000000001"

export async function ensureTestProfileAction(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[v0] Server action: ensureTestProfileAction called")

    const supabase = await createClient()

    // First, check if the profile exists
    const { data: existingProfile, error: selectError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", TEST_PROFILE_ID)
      .maybeSingle()

    if (existingProfile) {
      console.log("[v0] Server action: Profile already exists")
      return { success: true }
    }

    console.log("[v0] Server action: Profile doesn't exist, creating it")

    // Try to insert the profile
    const { error: insertError } = await supabase.from("profiles").insert({
      id: TEST_PROFILE_ID,
      email: "test@example.com",
      username: "test_user",
      display_name: "Test User",
      avatar_url: null,
    })

    if (insertError) {
      // Check if it's a duplicate key error (profile was created by another request)
      if (insertError.code === "23505") {
        console.log("[v0] Server action: Profile was created by another request")
        return { success: true }
      }

      console.error("[v0] Server action: Error creating profile:", insertError)
      return { success: false, error: insertError.message }
    }

    console.log("[v0] Server action: Profile created successfully")
    return { success: true }
  } catch (error) {
    console.error("[v0] Server action: Unexpected error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

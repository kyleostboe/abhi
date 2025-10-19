import { ensureTestProfileAction } from "@/app/actions/ensure-test-profile"

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

  // Only check once per session to avoid unnecessary calls
  if (profileEnsured) {
    console.log("[v0] Profile already ensured, skipping")
    return
  }

  try {
    console.log("[v0] Calling server action to ensure test profile exists")

    const result = await ensureTestProfileAction()

    if (!result.success) {
      throw new Error(`Failed to ensure test profile: ${result.error}`)
    }

    console.log("[v0] Test profile ensured successfully via server action")
    profileEnsured = true
  } catch (error) {
    console.error("[v0] Error in ensureTestProfile:", error)
    throw error
  }
}

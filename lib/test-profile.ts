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

import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/supabase/server"
import { getUsageBytesForPrefix } from "@/lib/storage"
import { log } from "@/lib/log"

export async function GET(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser(request)

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  try {
    const usedBytes = await getUsageBytesForPrefix(`${user.id}/`)
    return NextResponse.json({ usedBytes })
  } catch (error) {
    log.error("[storage] Failed to compute R2 usage:", error)
    return NextResponse.json({ error: "Unable to compute storage usage." }, { status: 500 })
  }
}

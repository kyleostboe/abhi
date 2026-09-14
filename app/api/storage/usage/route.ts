import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/supabase/server"
import { getUsageBytesForPrefix } from "@/lib/storage"
import { getEntitlements } from "@/lib/entitlements-server"
import { log } from "@/lib/log"

export async function GET(request: NextRequest) {
  const { user, supabase, error: authError } = await getAuthenticatedUser(request)

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  try {
    // The quota comes back with the usage so the client has nothing to guess at. It used to carry
    // its own copy of the number, which meant the bar could disagree with the route that actually
    // enforces it — and the enforcing side is the only one that was ever right.
    const [usedBytes, entitlements] = await Promise.all([
      getUsageBytesForPrefix(`${user.id}/`),
      getEntitlements(supabase, user.id),
    ])

    return NextResponse.json({
      usedBytes,
      quotaBytes: entitlements.storageQuotaBytes,
      tier: entitlements.tier,
    })
  } catch (error) {
    log.error("[storage] Failed to compute R2 usage:", error)
    return NextResponse.json({ error: "Unable to compute storage usage." }, { status: 500 })
  }
}

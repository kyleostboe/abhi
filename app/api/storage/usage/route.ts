import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUsageBytesForPrefix } from "@/lib/storage"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  try {
    const usedBytes = await getUsageBytesForPrefix(`${user.id}/`)
    return NextResponse.json({ usedBytes })
  } catch (error) {
    console.error("[storage] Failed to compute R2 usage:", error)
    return NextResponse.json({ error: "Unable to compute storage usage." }, { status: 500 })
  }
}

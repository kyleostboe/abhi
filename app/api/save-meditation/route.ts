import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("[v0] /api/save-meditation is disabled; audio is stored in IndexedDB on the client.")
  return NextResponse.json(
    { error: "Server-side saving is disabled. Save meditations from the client to keep audio local to the device." },
    { status: 410 },
  )
}

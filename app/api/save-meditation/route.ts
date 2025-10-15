import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { TEST_PROFILE_ID } from "@/lib/test-profile"

const MEDITATION_BUCKET = "meditations"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Environment check:")
    console.log("[v0] NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING")
    console.log("[v0] NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING")
    console.log("[v0] SUPABASE_URL:", process.env.SUPABASE_URL ? "SET" : "MISSING")
    console.log("[v0] SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "SET" : "MISSING")

    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const title = formData.get("title") as string
    const originalFileName = formData.get("originalFileName") as string
    const duration = Number.parseFloat(formData.get("duration") as string)
    const source = formData.get("source") as string
    const metadata = JSON.parse((formData.get("metadata") as string) || "{}")

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    if (source !== "adjuster" && source !== "encoder") {
      return NextResponse.json({ error: "Invalid meditation source" }, { status: 400 })
    }

    console.log("[v0] Processing audio upload")
    console.log("[v0] File size:", audioFile.size, "bytes")
    console.log("[v0] File type:", audioFile.type)

    const arrayBuffer = await audioFile.arrayBuffer()

    // Check file size limit (50MB)
    const maxSizeBytes = 50 * 1024 * 1024
    if (arrayBuffer.byteLength > maxSizeBytes) {
      return NextResponse.json(
        { error: `File too large (${Math.round(arrayBuffer.byteLength / 1024 / 1024)}MB). Maximum is 50MB.` },
        { status: 413 },
      )
    }

    const supabase = await createClient()

    console.log("[v0] Supabase client created successfully")
    console.log(`[v0] Attempting upload to '${MEDITATION_BUCKET}' bucket...`)

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const filename = `meditation_${timestamp}_${randomId}.wav`

    console.log("[v0] Uploading to Supabase Storage:", filename)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

    console.log("[v0] Making direct HTTP request to Supabase Storage API...")

    try {
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${MEDITATION_BUCKET}/${filename}`
      console.log("[v0] Upload URL:", uploadUrl)

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "audio/wav",
          "Cache-Control": "3600",
        },
        body: arrayBuffer,
      })

      console.log("[v0] Raw response status:", response.status)
      console.log("[v0] Raw response headers:", Object.fromEntries(response.headers.entries()))

      const responseText = await response.text()
      console.log("[v0] Raw response body:", responseText.substring(0, 500))

      if (!response.ok) {
        return NextResponse.json(
          { error: `Storage API returned ${response.status}: ${responseText}` },
          { status: response.status },
        )
      }

      // Parse the successful response
      const uploadData = JSON.parse(responseText)
      console.log("[v0] Upload successful, getting public URL...")

      const { data: urlData } = supabase.storage.from(MEDITATION_BUCKET).getPublicUrl(uploadData.Key || filename)

      // Save to database
      const meditationData = {
        title,
        description: originalFileName,
        audio_url: urlData.publicUrl,
        duration,
        source,
        metadata,
        original_filename: originalFileName,
        profile_id: TEST_PROFILE_ID,
      }

      const { data, error } = await supabase.from("meditations").insert(meditationData).select().single()

      if (error) {
        console.error("[v0] Database insert error:", error)
        return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
      }

      console.log("[v0] Meditation saved successfully:", data.id)

      return NextResponse.json({
        id: data.id,
        title: data.title,
        originalFileName: data.description,
        processedAudioUrl: data.audio_url,
        duration: data.duration,
        createdAt: data.created_at,
        source: source,
        metadata: metadata,
      })
    } catch (rawError: any) {
      console.error("[v0] Raw HTTP request failed:", rawError)
      console.error("[v0] Error message:", rawError.message)
      return NextResponse.json({ error: `Direct upload failed: ${rawError.message}` }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] Server error:", error)
    if (error instanceof Error && error.message.includes("Unexpected token")) {
      return NextResponse.json(
        {
          error: "Storage service returned invalid response. Please check bucket configuration.",
        },
        { status: 500 },
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

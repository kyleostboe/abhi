import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
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

    console.log("[v0] Server-side audio processing started")
    console.log("[v0] Original file size:", audioFile.size, "bytes")

    const arrayBuffer = await audioFile.arrayBuffer()

    const finalBuffer = arrayBuffer
    console.log("[v0] Using original file size:", finalBuffer.byteLength, "bytes")

    const supabase = await createClient()

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const filename = `meditation_${timestamp}_${randomId}.wav`

    console.log("[v0] Uploading audio to Supabase Storage:", filename)
    console.log("[v0] File details - Size:", finalBuffer.byteLength, "Type: audio/wav")

    const uploadResponse = await supabase.storage.from("meditation-audio").upload(filename, finalBuffer, {
      contentType: "audio/wav",
      cacheControl: "3600",
      upsert: false,
    })

    console.log("[v0] Upload response:", JSON.stringify(uploadResponse, null, 2))

    if (uploadResponse.error) {
      console.error("[v0] Storage upload error:", uploadResponse.error)

      const error = uploadResponse.error

      if (error.message?.includes("bucket") || error.message?.includes("not found")) {
        return NextResponse.json(
          { error: "Storage bucket not found. Please run the storage setup script first." },
          { status: 500 },
        )
      }

      if (error.message?.includes("size") || error.message?.includes("too large")) {
        return NextResponse.json(
          { error: `File too large (${Math.round(finalBuffer.byteLength / 1024 / 1024)}MB). Maximum is 50MB.` },
          { status: 413 },
        )
      }

      if (error.message?.includes("permission") || error.message?.includes("policy")) {
        return NextResponse.json({ error: "Storage permission denied. Please check bucket policies." }, { status: 403 })
      }

      return NextResponse.json({ error: `Upload failed: ${error.message || "Unknown storage error"}` }, { status: 500 })
    }

    if (!uploadResponse.data) {
      console.error("[v0] No upload data returned")
      return NextResponse.json({ error: "Upload failed: No data returned" }, { status: 500 })
    }

    console.log("[v0] Storage upload successful:", uploadResponse.data)

    // Get public URL
    const { data: urlData } = supabase.storage.from("meditation-audio").getPublicUrl(uploadResponse.data.path)

    // Save to database
    const meditationData = {
      title,
      description: originalFileName,
      audio_url: urlData.publicUrl,
      duration,
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
  } catch (error) {
    console.error("[v0] Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    console.log("[v0] Checking if 'meditations' bucket exists...")
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()

    if (bucketError) {
      console.error("[v0] Error checking buckets:", bucketError)
      return NextResponse.json({ error: "Storage service unavailable" }, { status: 500 })
    }

    const meditationsBucket = buckets?.find((bucket) => bucket.name === "meditations")
    if (!meditationsBucket) {
      console.log("[v0] 'meditations' bucket not found, creating it...")

      const { data: newBucket, error: createError } = await supabase.storage.createBucket("meditations", {
        public: true,
        allowedMimeTypes: ["audio/wav", "audio/mpeg", "audio/mp3"],
        fileSizeLimit: 52428800, // 50MB
      })

      if (createError) {
        console.error("[v0] Failed to create bucket:", createError)
        return NextResponse.json(
          {
            error: `Failed to create storage bucket: ${createError.message}. Please create it manually in Supabase.`,
          },
          { status: 500 },
        )
      }

      console.log("[v0] Successfully created 'meditations' bucket")
    }

    console.log("[v0] Bucket exists, proceeding with upload...")

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const filename = `meditation_${timestamp}_${randomId}.wav`

    console.log("[v0] Uploading to Supabase Storage:", filename)

    let uploadResponse
    try {
      uploadResponse = await supabase.storage.from("meditations").upload(filename, arrayBuffer, {
        contentType: "audio/wav",
        cacheControl: "3600",
        upsert: false,
      })
    } catch (uploadError: any) {
      console.error("[v0] Upload threw exception:", uploadError)
      // Handle cases where Supabase returns HTML instead of JSON
      if (uploadError.message && uploadError.message.includes("Unexpected token")) {
        return NextResponse.json(
          {
            error: "Storage service returned invalid response. Check bucket permissions and policies.",
          },
          { status: 500 },
        )
      }
      throw uploadError
    }

    if (uploadResponse.error) {
      const errorMessage = uploadResponse.error.message || "Unknown storage error"
      console.error("[v0] Storage upload failed:", errorMessage)
      console.error("[v0] Full error object:", JSON.stringify(uploadResponse.error, null, 2))

      if (errorMessage.includes("bucket")) {
        return NextResponse.json(
          { error: "Storage bucket 'meditations' not found. Please create the bucket in Supabase." },
          { status: 500 },
        )
      }

      if (errorMessage.includes("size") || errorMessage.includes("too large")) {
        return NextResponse.json(
          { error: `File too large (${Math.round(arrayBuffer.byteLength / 1024 / 1024)}MB). Maximum is 50MB.` },
          { status: 413 },
        )
      }

      if (errorMessage.includes("permission") || errorMessage.includes("policy")) {
        return NextResponse.json(
          {
            error: "Storage permission denied. Please check RLS policies for 'meditations' bucket.",
          },
          { status: 403 },
        )
      }

      return NextResponse.json({ error: `Storage upload failed: ${errorMessage}` }, { status: 500 })
    }

    if (!uploadResponse.data) {
      return NextResponse.json({ error: "Upload failed: No data returned" }, { status: 500 })
    }

    console.log("[v0] Storage upload successful")

    const { data: urlData } = supabase.storage.from("meditations").getPublicUrl(uploadResponse.data.path)

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

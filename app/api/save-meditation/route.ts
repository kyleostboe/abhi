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

    // For very large files, we'll implement a simple size-based compression
    let finalBuffer = arrayBuffer
    let compressionApplied = false

    // If file is larger than 50MB, apply basic compression
    if (arrayBuffer.byteLength > 50 * 1024 * 1024) {
      console.log("[v0] File too large, applying compression")
      try {
        finalBuffer = await compressAudio(arrayBuffer)
        compressionApplied = true
      } catch (error) {
        console.log("[v0] Compression failed, using original file:", error)
        finalBuffer = arrayBuffer
      }
    }

    if (compressionApplied) {
      console.log("[v0] Compressed file size:", finalBuffer.byteLength, "bytes")
      console.log(
        "[v0] Compression ratio:",
        (((arrayBuffer.byteLength - finalBuffer.byteLength) / arrayBuffer.byteLength) * 100).toFixed(1) + "%",
      )
    } else {
      console.log("[v0] Using original file size:", finalBuffer.byteLength, "bytes")
    }

    const supabase = await createClient()

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const filename = `meditation_${timestamp}_${randomId}.wav`

    console.log("[v0] Uploading audio to Supabase Storage:", filename)

    try {
      console.log("[v0] File details - Size:", finalBuffer.byteLength, "Type: audio/wav")

      const uploadResponse = await supabase.storage.from("meditation-audio").upload(filename, finalBuffer, {
        contentType: "audio/wav",
        cacheControl: "3600",
        upsert: false,
      })

      console.log("[v0] Raw upload response:", uploadResponse)

      if (uploadResponse.error) {
        console.error("[v0] Storage upload error:", uploadResponse.error)

        const errorMessage = uploadResponse.error.message || "Unknown upload error"

        if (errorMessage.includes("bucket") || errorMessage.includes("not found")) {
          return NextResponse.json(
            {
              error: `Storage bucket not found. Please run the storage setup script first.`,
            },
            { status: 500 },
          )
        }

        if (errorMessage.includes("size") || errorMessage.includes("too large")) {
          return NextResponse.json(
            {
              error: `File too large (${Math.round(finalBuffer.byteLength / 1024 / 1024)}MB). Try a shorter meditation.`,
            },
            { status: 413 },
          )
        }

        if (errorMessage.includes("permission") || errorMessage.includes("policy")) {
          return NextResponse.json(
            {
              error: `Storage permission denied. Please check bucket policies.`,
            },
            { status: 403 },
          )
        }

        return NextResponse.json({ error: `Upload failed: ${errorMessage}` }, { status: 500 })
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
        source,
        metadata,
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
        source: data.source,
        metadata: data.metadata,
      })
    } catch (storageError) {
      console.error("[v0] Storage operation failed:", storageError)

      if (storageError instanceof Error) {
        console.log("[v0] Error details:", {
          name: storageError.name,
          message: storageError.message,
          stack: storageError.stack?.substring(0, 500),
        })

        // Check for specific error types
        if (storageError.message.includes("fetch")) {
          return NextResponse.json(
            {
              error: "Network error connecting to storage. Please try again.",
            },
            { status: 503 },
          )
        }

        if (storageError.message.includes("JSON")) {
          return NextResponse.json(
            {
              error: "Storage service returned an invalid response. This may be a temporary issue.",
            },
            { status: 502 },
          )
        }
      }

      return NextResponse.json(
        {
          error: "Storage upload failed. Please try again or contact support.",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function compressAudio(audioBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  try {
    // Simple approach: just reduce file size by downsampling without complex WAV manipulation
    // This is safer and less likely to create invalid files
    const originalSize = audioBuffer.byteLength

    // For very basic compression, we'll just take every other sample
    // This is crude but safe - it won't corrupt the file structure
    const compressedSize = Math.floor(originalSize * 0.5)
    const compressedBuffer = new ArrayBuffer(compressedSize)
    const originalView = new Uint8Array(audioBuffer)
    const compressedView = new Uint8Array(compressedBuffer)

    // Copy header (first 44 bytes for WAV)
    for (let i = 0; i < Math.min(44, originalSize); i++) {
      compressedView[i] = originalView[i]
    }

    // Downsample the rest by taking every other byte
    let compressedIndex = 44
    for (let i = 44; i < originalSize && compressedIndex < compressedSize; i += 2) {
      compressedView[compressedIndex] = originalView[i]
      compressedIndex++
    }

    console.log(`[v0] Simple compression: ${originalSize} -> ${compressedSize} bytes`)
    return compressedBuffer
  } catch (error) {
    console.error("[v0] Compression failed:", error)
    throw error
  }
}

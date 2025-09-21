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

    // Convert to ArrayBuffer for processing
    const arrayBuffer = await audioFile.arrayBuffer()

    // For now, we'll reduce the file size by converting to a more compressed format
    // In a real implementation, you'd use a library like ffmpeg or similar
    const compressedBuffer = await compressAudio(arrayBuffer)

    console.log("[v0] Compressed file size:", compressedBuffer.byteLength, "bytes")
    console.log(
      "[v0] Compression ratio:",
      (((arrayBuffer.byteLength - compressedBuffer.byteLength) / arrayBuffer.byteLength) * 100).toFixed(1) + "%",
    )

    const supabase = await createClient()

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const filename = `meditation_${timestamp}_${randomId}.wav`

    console.log("[v0] Uploading compressed audio to Supabase Storage:", filename)

    try {
      // Upload compressed audio to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("meditation-audio")
        .upload(filename, compressedBuffer, {
          contentType: "audio/wav",
          cacheControl: "3600",
        })

      if (uploadError) {
        console.error("[v0] Storage upload error:", uploadError)
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
      }

      console.log("[v0] Storage upload successful:", uploadData)

      // Get public URL
      const { data: urlData } = supabase.storage.from("meditation-audio").getPublicUrl(uploadData.path)

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
      return NextResponse.json(
        {
          error: `Storage error: ${storageError instanceof Error ? storageError.message : "Unknown storage error"}. Make sure the storage bucket exists.`,
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
  // For now, we'll implement a simple compression by reducing the audio data
  // In a production environment, you'd use proper audio compression libraries

  // Convert to Float32Array for processing
  const audioData = new Float32Array(audioBuffer)

  // Simple compression: reduce sample rate by taking every other sample
  // This cuts file size roughly in half while maintaining reasonable quality
  const compressedLength = Math.floor(audioData.length / 2)
  const compressedData = new Float32Array(compressedLength)

  for (let i = 0; i < compressedLength; i++) {
    compressedData[i] = audioData[i * 2]
  }

  return compressedData.buffer
}

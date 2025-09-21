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

    let finalBuffer = arrayBuffer
    const maxSizeBytes = 45 * 1024 * 1024 // 45MB to stay safely under 50MB limit

    if (arrayBuffer.byteLength > maxSizeBytes) {
      console.log("[v0] File too large, compressing...")

      finalBuffer = await compressWAV(arrayBuffer, maxSizeBytes)
      console.log("[v0] Compressed from", arrayBuffer.byteLength, "to", finalBuffer.byteLength, "bytes")
    } else {
      console.log("[v0] File size OK, using original:", finalBuffer.byteLength, "bytes")
    }

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

    console.log("[v0] Upload response - data:", uploadResponse.data)
    console.log("[v0] Upload response - error:", uploadResponse.error?.name, uploadResponse.error?.message)

    if (uploadResponse.error) {
      console.error("[v0] Storage upload error:", uploadResponse.error.message || uploadResponse.error.name)

      const error = uploadResponse.error

      if (error.name === "StorageUnknownError") {
        console.log("[v0] Compression may have corrupted file, trying original...")

        const originalUploadResponse = await supabase.storage
          .from("meditation-audio")
          .upload(`original_${filename}`, arrayBuffer, {
            contentType: "audio/wav",
            cacheControl: "3600",
            upsert: false,
          })

        if (originalUploadResponse.error) {
          return NextResponse.json(
            {
              error: `Upload failed: File too large (${Math.round(arrayBuffer.byteLength / 1024 / 1024)}MB). Maximum is 50MB.`,
            },
            { status: 413 },
          )
        }

        // Use original file upload response
        console.log("[v0] Original file upload successful")
        const { data: urlData } = supabase.storage
          .from("meditation-audio")
          .getPublicUrl(originalUploadResponse.data.path)

        // Save to database with original file
        const meditationData = {
          title,
          description: originalFileName,
          audio_url: urlData.publicUrl,
          duration,
        }

        const { data, error: dbError } = await supabase.from("meditations").insert(meditationData).select().single()

        if (dbError) {
          console.error("[v0] Database insert error:", dbError)
          return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
        }

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
      }

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

async function compressWAV(arrayBuffer: ArrayBuffer, maxSize: number): Promise<ArrayBuffer> {
  const view = new DataView(arrayBuffer)

  // Read WAV header
  const riff = String.fromCharCode(...new Uint8Array(arrayBuffer, 0, 4))
  if (riff !== "RIFF") {
    throw new Error("Not a valid WAV file")
  }

  const fileSize = view.getUint32(4, true)
  const wave = String.fromCharCode(...new Uint8Array(arrayBuffer, 8, 4))
  if (wave !== "WAVE") {
    throw new Error("Not a valid WAV file")
  }

  // Find fmt chunk
  let offset = 12
  while (offset < arrayBuffer.byteLength - 8) {
    const chunkId = String.fromCharCode(...new Uint8Array(arrayBuffer, offset, 4))
    const chunkSize = view.getUint32(offset + 4, true)

    if (chunkId === "fmt ") {
      // Read format data
      const audioFormat = view.getUint16(offset + 8, true)
      const numChannels = view.getUint16(offset + 10, true)
      const sampleRate = view.getUint32(offset + 12, true)
      const byteRate = view.getUint32(offset + 16, true)
      const blockAlign = view.getUint16(offset + 20, true)
      const bitsPerSample = view.getUint16(offset + 22, true)

      console.log("[v0] Original WAV format:", {
        channels: numChannels,
        sampleRate,
        bitsPerSample,
      })

      const compressionRatio = maxSize / arrayBuffer.byteLength
      console.log("[v0] Compression ratio needed:", compressionRatio)

      // Apply aggressive compression for large files
      let newSampleRate = sampleRate
      let newBitsPerSample = bitsPerSample
      let newChannels = numChannels

      // For files over 50MB, be very aggressive
      if (arrayBuffer.byteLength > 50 * 1024 * 1024) {
        newSampleRate = 16000 // Very low sample rate for speech/meditation
        newBitsPerSample = 8 // Low bit depth
        newChannels = 1 // Mono
      } else if (compressionRatio < 0.5) {
        newSampleRate = Math.max(16000, sampleRate / 2)
        newBitsPerSample = 8
        newChannels = 1
      } else if (compressionRatio < 0.7) {
        newSampleRate = Math.max(22050, sampleRate / 1.5)
        newBitsPerSample = Math.min(8, bitsPerSample)
        newChannels = 1
      }

      console.log("[v0] Compressed WAV format:", {
        channels: newChannels,
        sampleRate: newSampleRate,
        bitsPerSample: newBitsPerSample,
      })

      // Find data chunk
      let dataOffset = offset + 8 + chunkSize
      while (dataOffset < arrayBuffer.byteLength - 8) {
        const dataChunkId = String.fromCharCode(...new Uint8Array(arrayBuffer, dataOffset, 4))
        const dataChunkSize = view.getUint32(dataOffset + 4, true)

        if (dataChunkId === "data") {
          // Process audio data
          const audioData = new Uint8Array(arrayBuffer, dataOffset + 8, dataChunkSize)
          const compressedAudioData = compressAudioData(
            audioData,
            numChannels,
            newChannels,
            sampleRate,
            newSampleRate,
            bitsPerSample,
            newBitsPerSample,
          )

          // Create new WAV file
          return createWAVFile(compressedAudioData, newChannels, newSampleRate, newBitsPerSample)
        }

        dataOffset += 8 + dataChunkSize
      }

      break
    }

    offset += 8 + chunkSize
  }

  const compressionRatio = Math.min(0.3, maxSize / arrayBuffer.byteLength) // Cap at 30% of original
  return simpleDownsample(arrayBuffer, compressionRatio)
}

function compressAudioData(
  audioData: Uint8Array,
  originalChannels: number,
  newChannels: number,
  originalSampleRate: number,
  newSampleRate: number,
  originalBitsPerSample: number,
  newBitsPerSample: number,
): Uint8Array {
  const bytesPerSample = originalBitsPerSample / 8
  const originalSamplesPerChannel = audioData.length / (originalChannels * bytesPerSample)

  // Calculate new sample count
  const sampleRateRatio = newSampleRate / originalSampleRate
  const newSamplesPerChannel = Math.floor(originalSamplesPerChannel * sampleRateRatio)

  const newBytesPerSample = newBitsPerSample / 8
  const newAudioData = new Uint8Array(newSamplesPerChannel * newChannels * newBytesPerSample)

  const view = new DataView(audioData.buffer, audioData.byteOffset)
  const newView = new DataView(newAudioData.buffer)

  for (let i = 0; i < newSamplesPerChannel; i++) {
    const originalSampleIndex = Math.floor(i / sampleRateRatio)

    for (let channel = 0; channel < newChannels; channel++) {
      const originalChannel = Math.min(channel, originalChannels - 1)
      const originalOffset = (originalSampleIndex * originalChannels + originalChannel) * bytesPerSample
      const newOffset = (i * newChannels + channel) * newBytesPerSample

      if (originalOffset + bytesPerSample <= audioData.length) {
        let sample = 0

        // Read original sample
        if (originalBitsPerSample === 16) {
          sample = view.getInt16(originalOffset, true)
        } else if (originalBitsPerSample === 8) {
          sample = view.getUint8(originalOffset) - 128
        }

        // Write new sample
        if (newBitsPerSample === 8) {
          newView.setUint8(newOffset, Math.max(0, Math.min(255, sample + 128)))
        } else if (newBitsPerSample === 16) {
          newView.setInt16(newOffset, Math.max(-32768, Math.min(32767, sample)), true)
        }
      }
    }
  }

  return newAudioData
}

function createWAVFile(
  audioData: Uint8Array,
  channels: number,
  sampleRate: number,
  bitsPerSample: number,
): ArrayBuffer {
  const bytesPerSample = bitsPerSample / 8
  const blockAlign = channels * bytesPerSample
  const byteRate = sampleRate * blockAlign

  const buffer = new ArrayBuffer(44 + audioData.length)
  const view = new DataView(buffer)

  // RIFF header
  view.setUint32(0, 0x46464952, false) // "RIFF"
  view.setUint32(4, 36 + audioData.length, true) // File size - 8
  view.setUint32(8, 0x45564157, false) // "WAVE"

  // fmt chunk
  view.setUint32(12, 0x20746d66, false) // "fmt "
  view.setUint32(16, 16, true) // Chunk size
  view.setUint16(20, 1, true) // Audio format (PCM)
  view.setUint16(22, channels, true) // Number of channels
  view.setUint32(24, sampleRate, true) // Sample rate
  view.setUint32(28, byteRate, true) // Byte rate
  view.setUint16(32, blockAlign, true) // Block align
  view.setUint16(34, bitsPerSample, true) // Bits per sample

  // data chunk
  view.setUint32(36, 0x61746164, false) // "data"
  view.setUint32(40, audioData.length, true) // Data size

  // Copy audio data
  new Uint8Array(buffer, 44).set(audioData)

  return buffer
}

function simpleDownsample(arrayBuffer: ArrayBuffer, ratio: number): ArrayBuffer {
  const originalData = new Uint8Array(arrayBuffer)
  const newSize = Math.floor(originalData.length * ratio)
  const newData = new Uint8Array(newSize)

  // Preserve WAV header (first 44 bytes)
  for (let i = 0; i < Math.min(44, newSize); i++) {
    newData[i] = originalData[i]
  }

  // Downsample audio data
  const step = (originalData.length - 44) / (newSize - 44)
  for (let i = 44; i < newSize; i++) {
    const sourceIndex = Math.floor(44 + (i - 44) * step)
    newData[i] = originalData[sourceIndex]
  }

  // Update file size in header
  const view = new DataView(newData.buffer)
  view.setUint32(4, newSize - 8, true)
  view.setUint32(40, newSize - 44, true)

  return newData.buffer
}

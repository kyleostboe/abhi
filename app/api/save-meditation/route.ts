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
        if (uploadError.message?.includes("bucket") || uploadError.message?.includes("not found")) {
          return NextResponse.json(
            {
              error: `Storage bucket not found. Please run the storage setup script first: scripts/002_create_storage_bucket.sql`,
            },
            { status: 500 },
          )
        }
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
      let errorMessage = "Unknown storage error"
      if (storageError instanceof Error) {
        errorMessage = storageError.message
        // Check if it's a JSON parsing error (HTML response from missing bucket)
        if (errorMessage.includes("Unexpected token") && errorMessage.includes("not valid JSON")) {
          errorMessage =
            "Storage bucket 'meditation-audio' not found. Please run scripts/002_create_storage_bucket.sql first."
        }
      }

      return NextResponse.json(
        {
          error: `Storage error: ${errorMessage}`,
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
    const dataView = new DataView(audioBuffer)

    // Check if it's a valid WAV file
    const riffHeader = String.fromCharCode(
      dataView.getUint8(0),
      dataView.getUint8(1),
      dataView.getUint8(2),
      dataView.getUint8(3),
    )

    if (riffHeader !== "RIFF") {
      console.log("[v0] Not a WAV file, returning original")
      return audioBuffer
    }

    // Read WAV header information
    const fileSize = dataView.getUint32(4, true)
    const waveHeader = String.fromCharCode(
      dataView.getUint8(8),
      dataView.getUint8(9),
      dataView.getUint8(10),
      dataView.getUint8(11),
    )

    if (waveHeader !== "WAVE") {
      console.log("[v0] Invalid WAV format, returning original")
      return audioBuffer
    }

    // Find the fmt chunk
    let offset = 12
    let fmtChunkFound = false
    let fmtChunkSize = 0
    let fmtChunkOffset = 0

    while (offset < audioBuffer.byteLength - 8) {
      const chunkId = String.fromCharCode(
        dataView.getUint8(offset),
        dataView.getUint8(offset + 1),
        dataView.getUint8(offset + 2),
        dataView.getUint8(offset + 3),
      )

      const chunkSize = dataView.getUint32(offset + 4, true)

      if (chunkId === "fmt ") {
        fmtChunkFound = true
        fmtChunkOffset = offset
        fmtChunkSize = chunkSize
        break
      }

      offset += 8 + chunkSize
    }

    if (!fmtChunkFound) {
      console.log("[v0] No fmt chunk found, returning original")
      return audioBuffer
    }

    // Read format information
    const audioFormat = dataView.getUint16(fmtChunkOffset + 8, true)
    const numChannels = dataView.getUint16(fmtChunkOffset + 10, true)
    const sampleRate = dataView.getUint32(fmtChunkOffset + 12, true)
    const bitsPerSample = dataView.getUint16(fmtChunkOffset + 22, true)

    console.log(`[v0] Original format: ${numChannels} channels, ${sampleRate}Hz, ${bitsPerSample}-bit`)

    // Find the data chunk
    offset = fmtChunkOffset + 8 + fmtChunkSize
    let dataChunkFound = false
    let dataChunkOffset = 0
    let dataChunkSize = 0

    while (offset < audioBuffer.byteLength - 8) {
      const chunkId = String.fromCharCode(
        dataView.getUint8(offset),
        dataView.getUint8(offset + 1),
        dataView.getUint8(offset + 2),
        dataView.getUint8(offset + 3),
      )

      const chunkSize = dataView.getUint32(offset + 4, true)

      if (chunkId === "data") {
        dataChunkFound = true
        dataChunkOffset = offset + 8
        dataChunkSize = chunkSize
        break
      }

      offset += 8 + chunkSize
    }

    if (!dataChunkFound) {
      console.log("[v0] No data chunk found, returning original")
      return audioBuffer
    }

    // Compress by reducing sample rate and bit depth
    const targetSampleRate = Math.min(22050, sampleRate) // Reduce to 22kHz max
    const targetBitsPerSample = Math.min(8, bitsPerSample) // Reduce to 8-bit max
    const targetChannels = 1 // Convert to mono

    const sampleRateRatio = sampleRate / targetSampleRate
    const originalSamplesPerChannel = dataChunkSize / (numChannels * (bitsPerSample / 8))
    const targetSamplesPerChannel = Math.floor(originalSamplesPerChannel / sampleRateRatio)

    console.log(`[v0] Target format: ${targetChannels} channels, ${targetSampleRate}Hz, ${targetBitsPerSample}-bit`)
    console.log(`[v0] Samples: ${originalSamplesPerChannel} -> ${targetSamplesPerChannel}`)

    // Create new compressed audio data
    const targetDataSize = targetSamplesPerChannel * targetChannels * (targetBitsPerSample / 8)
    const targetFileSize = 44 + targetDataSize // Standard WAV header is 44 bytes

    const compressedBuffer = new ArrayBuffer(targetFileSize)
    const compressedView = new DataView(compressedBuffer)

    // Write WAV header
    // RIFF header
    compressedView.setUint8(0, 0x52) // R
    compressedView.setUint8(1, 0x49) // I
    compressedView.setUint8(2, 0x46) // F
    compressedView.setUint8(3, 0x46) // F
    compressedView.setUint32(4, targetFileSize - 8, true) // File size - 8
    compressedView.setUint8(8, 0x57) // W
    compressedView.setUint8(9, 0x41) // A
    compressedView.setUint8(10, 0x56) // V
    compressedView.setUint8(11, 0x45) // E

    // fmt chunk
    compressedView.setUint8(12, 0x66) // f
    compressedView.setUint8(13, 0x6d) // m
    compressedView.setUint8(14, 0x74) // t
    compressedView.setUint8(15, 0x20) // space
    compressedView.setUint32(16, 16, true) // fmt chunk size
    compressedView.setUint16(20, 1, true) // PCM format
    compressedView.setUint16(22, targetChannels, true) // channels
    compressedView.setUint32(24, targetSampleRate, true) // sample rate
    compressedView.setUint32(28, targetSampleRate * targetChannels * (targetBitsPerSample / 8), true) // byte rate
    compressedView.setUint16(32, targetChannels * (targetBitsPerSample / 8), true) // block align
    compressedView.setUint16(34, targetBitsPerSample, true) // bits per sample

    // data chunk header
    compressedView.setUint8(36, 0x64) // d
    compressedView.setUint8(37, 0x61) // a
    compressedView.setUint8(38, 0x74) // t
    compressedView.setUint8(39, 0x61) // a
    compressedView.setUint32(40, targetDataSize, true) // data size

    // Compress and write audio data
    const bytesPerSample = bitsPerSample / 8
    const targetBytesPerSample = targetBitsPerSample / 8

    for (let i = 0; i < targetSamplesPerChannel; i++) {
      const originalSampleIndex = Math.floor(i * sampleRateRatio)
      const originalByteOffset = dataChunkOffset + originalSampleIndex * numChannels * bytesPerSample

      // Read original sample (convert to mono by averaging channels)
      let sampleValue = 0
      for (let channel = 0; channel < numChannels; channel++) {
        const channelOffset = originalByteOffset + channel * bytesPerSample
        if (channelOffset + bytesPerSample <= audioBuffer.byteLength) {
          if (bitsPerSample === 16) {
            sampleValue += dataView.getInt16(channelOffset, true)
          } else if (bitsPerSample === 8) {
            sampleValue += dataView.getUint8(channelOffset) - 128
          }
        }
      }
      sampleValue = Math.floor(sampleValue / numChannels)

      // Write compressed sample
      const targetByteOffset = 44 + i * targetBytesPerSample
      if (targetBitsPerSample === 8) {
        // Convert to 8-bit unsigned
        const uint8Value = Math.max(0, Math.min(255, Math.floor((sampleValue + 128) * (255 / 256))))
        compressedView.setUint8(targetByteOffset, uint8Value)
      } else if (targetBitsPerSample === 16) {
        // Keep as 16-bit signed
        const int16Value = Math.max(-32768, Math.min(32767, sampleValue))
        compressedView.setInt16(targetByteOffset, int16Value, true)
      }
    }

    console.log(`[v0] Compression successful: ${audioBuffer.byteLength} -> ${compressedBuffer.byteLength} bytes`)
    return compressedBuffer
  } catch (error) {
    console.error("[v0] Compression failed:", error)
    console.log("[v0] Returning original file")
    return audioBuffer
  }
}

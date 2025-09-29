"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MeditationLibrary, type SavedMeditation, type Playlist } from "@/lib/meditation-library"
import { BookmarkPlus, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SaveMeditationDialogProps {
  audioUrl: string
  originalFileName: string
  duration: number
  source: "adjuster" | "encoder"
  metadata: SavedMeditation["metadata"]
  children?: React.ReactNode
}

export function SaveMeditationDialog({
  audioUrl,
  originalFileName,
  duration,
  source,
  metadata,
  children,
}: SaveMeditationDialogProps) {
  const [open, setOpen] = useState(false)
  const metadataWithTitle = metadata as { meditationTitle?: unknown }
  const metadataTitleRaw =
    typeof metadataWithTitle?.meditationTitle === "string" ? metadataWithTitle.meditationTitle : ""
  const metadataTitle = metadataTitleRaw.trim()
  const [title, setTitle] = useState(() => {
    const baseTitle = metadataTitle || originalFileName
    return baseTitle.replace(/\.[^/.]+$/, "")
  })
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("")
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("")
  const [showNewPlaylist, setShowNewPlaylist] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const loadPlaylists = useCallback(async () => {
    try {
      const allPlaylists = await MeditationLibrary.getAllPlaylists()
      setPlaylists(allPlaylists)
    } catch (error) {
      console.error("[v0] Failed to load playlists:", error)
      setPlaylists([])
    }
  }, [])

  useEffect(() => {
    if (open) {
      void loadPlaylists()
    }
  }, [open, loadPlaylists])

  useEffect(() => {
    if (open) {
      const baseTitle = metadataTitle || originalFileName
      setTitle(baseTitle.replace(/\.[^/.]+$/, ""))
    }
  }, [open, originalFileName, metadataTitle])

  const handleSave = async () => {
    if (isSaving) {
      return
    }

    console.log("[v0] Save button clicked - starting save process...")
    console.log("[v0] Audio URL exists:", !!audioUrl)
    console.log("[v0] Title:", title.trim())
    console.log("[v0] Duration:", duration)
    console.log("[v0] Source:", source)
    console.log("[v0] Metadata:", metadata)

    if (!title.trim()) {
      console.log("[v0] Save failed: No title provided")
      toast({
        title: "Title required",
        description: "Please enter a title for your meditation.",
        variant: "destructive",
      })
      return
    }

    if (!audioUrl) {
      console.log("[v0] Save failed: No audio URL provided")
      toast({
        title: "No audio to save",
        description: "There's no processed audio to save.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      console.log("[v0] Starting enhanced audio compression...")

      const response = await fetch(audioUrl)
      const audioBlob = await response.blob()
      const originalSize = audioBlob.size
      console.log("[v0] Original audio size:", originalSize, "bytes")

      let processedBlob = audioBlob

      let audioContext: AudioContext | null = null
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const arrayBuffer = await audioBlob.arrayBuffer()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

        // Determine compression level based on original size
        let targetSampleRate: number
        let targetBitDepth: number

        if (originalSize > 100 * 1024 * 1024) {
          // > 100MB
          targetSampleRate = 8000 // Very aggressive
          targetBitDepth = 8
        } else if (originalSize > 75 * 1024 * 1024) {
          // > 75MB
          targetSampleRate = 11025 // Aggressive
          targetBitDepth = 8
        } else if (originalSize > 50 * 1024 * 1024) {
          // > 50MB
          targetSampleRate = 16000 // Moderate
          targetBitDepth = 8
        } else {
          targetSampleRate = 22050 // Light compression
          targetBitDepth = 16
        }

        console.log(`[v0] Applying compression: ${targetSampleRate}Hz, ${targetBitDepth}-bit`)

        const channels = 1 // Force mono for maximum compression
        const length = Math.floor((audioBuffer.length * targetSampleRate) / audioBuffer.sampleRate)
        const offlineContext = new OfflineAudioContext(channels, length, targetSampleRate)

        const sourceNode = offlineContext.createBufferSource()
        sourceNode.buffer = audioBuffer
        sourceNode.connect(offlineContext.destination)
        sourceNode.start()

        const compressedBuffer = await offlineContext.startRendering()
        const compressedBlob = await audioBufferToWav(compressedBuffer, targetBitDepth)

        console.log("[v0] Compressed from", originalSize, "to", compressedBlob.size, "bytes")

        // If still too large, apply additional compression
        if (compressedBlob.size > 45 * 1024 * 1024) {
          // Leave 5MB buffer under 50MB limit
          console.log("[v0] File still too large, applying additional compression...")

          // Try even more aggressive settings
          const ultraLength = Math.floor(length * 0.8) // Reduce length by 20%
          const ultraContext = new OfflineAudioContext(1, ultraLength, 8000)

          const ultraSource = ultraContext.createBufferSource()
          ultraSource.buffer = compressedBuffer
          ultraSource.connect(ultraContext.destination)
          ultraSource.start()

          const ultraCompressed = await ultraContext.startRendering()
          const ultraBlob = await audioBufferToWav(ultraCompressed, 8)

          console.log("[v0] Ultra-compressed to", ultraBlob.size, "bytes")
          processedBlob = ultraBlob
        } else {
          processedBlob = compressedBlob
        }

        // Final check - if still too large, reject with helpful message
        if (processedBlob.size > 48 * 1024 * 1024) {
          // 48MB hard limit
          throw new Error(
            `File too large (${Math.round(processedBlob.size / 1024 / 1024)}MB). Maximum size is 48MB. Try processing a shorter meditation or contact support for larger file limits.`,
          )
        }
      } catch (compressionError) {
        console.log("[v0] Compression failed:", compressionError)
        if (compressionError instanceof Error && compressionError.message.includes("File too large")) {
          throw compressionError // Re-throw size limit errors
        }
        console.log("[v0] Using original file due to compression failure")

        // Check if original is too large
        if (originalSize > 48 * 1024 * 1024) {
          throw new Error(
            `Original file too large (${Math.round(originalSize / 1024 / 1024)}MB). Maximum size is 48MB.`,
          )
        }
      } finally {
        if (audioContext) {
          try {
            await audioContext.close()
          } catch (closeError) {
            console.log("[v0] Error closing audio context:", closeError)
          }
        }
      }

      let processedBlobUrl: string | null = null
      try {
        processedBlobUrl = URL.createObjectURL(processedBlob)
        console.log("[v0] Attempting to save meditation via MeditationLibrary")

        const savedMeditation = await MeditationLibrary.saveMeditation({
          title: title.trim(),
          originalFileName,
          processedAudioUrl: processedBlobUrl,
          duration,
          source,
          metadata,
        })

        let playlistId = selectedPlaylist
        if (showNewPlaylist && newPlaylistName.trim()) {
          console.log("[v0] Creating new playlist:", newPlaylistName.trim())
          const newPlaylist = await MeditationLibrary.createPlaylist(
            newPlaylistName.trim(),
            newPlaylistDescription.trim(),
          )
          playlistId = newPlaylist.id
          console.log("[v0] New playlist created with ID:", newPlaylist.id)
        }

        if (playlistId) {
          console.log("[v0] Adding meditation to playlist:", playlistId)
          await MeditationLibrary.addToPlaylist(playlistId, savedMeditation.id)
          console.log("[v0] Added to playlist successfully")
        }

        await loadPlaylists()

        console.log("[v0] Save process completed successfully")
        toast({
          title: "Meditation saved!",
          description: `"${title}" has been added to your library.`,
        })

        const baseTitle = metadataTitle || originalFileName
        setTitle(baseTitle.replace(/\.[^/.]+$/, ""))
        setSelectedPlaylist("")
        setNewPlaylistName("")
        setNewPlaylistDescription("")
        setShowNewPlaylist(false)
        setOpen(false)
      } finally {
        if (processedBlobUrl) {
          URL.revokeObjectURL(processedBlobUrl)
        }
      }
    } catch (error) {
      console.error("[v0] Save failed with error:", error)
      toast({
        title: "Save failed",
        description: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const audioBufferToWav = async (buffer: AudioBuffer, bitDepth = 16): Promise<Blob> => {
    const length = buffer.length
    const sampleRate = buffer.sampleRate
    const channels = buffer.numberOfChannels
    const bytesPerSample = bitDepth / 8

    const arrayBuffer = new ArrayBuffer(44 + length * channels * bytesPerSample)
    const view = new DataView(arrayBuffer)

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, "RIFF")
    view.setUint32(4, 36 + length * channels * bytesPerSample, true)
    writeString(8, "WAVE")
    writeString(12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true) // PCM format
    view.setUint16(22, channels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * channels * bytesPerSample, true) // byte rate
    view.setUint16(32, channels * bytesPerSample, true) // block align
    view.setUint16(34, bitDepth, true) // bits per sample
    writeString(36, "data")
    view.setUint32(40, length * channels * bytesPerSample, true)

    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < channels; channel++) {
        const floatSample = buffer.getChannelData(channel)[i]
        const clampedSample = Math.max(-1, Math.min(1, floatSample))

        if (bitDepth === 8) {
          // 8-bit unsigned
          const intSample = Math.round((clampedSample + 1) * 127.5)
          view.setUint8(offset, intSample)
          offset += 1
        } else {
          // 16-bit signed
          const intSample = Math.round(clampedSample * 32767)
          view.setInt16(offset, intSample, true)
          offset += 2
        }
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-gradient-to-r from-logo-teal-500 to-logo-blue-400 hover:from-logo-teal-600 hover:to-logo-blue-500 text-white">
            <BookmarkPlus className="w-4 h-4 mr-2" />
            Save to Library
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" aria-describedby="save-meditation-description">
        <DialogHeader>
          <DialogTitle>Save Meditation to Library</DialogTitle>
        </DialogHeader>
        <div id="save-meditation-description" className="sr-only">
          Save your processed meditation audio to your personal library with optional playlist organization
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter meditation title"
            />
          </div>

          <div>
            <Label>Add to Playlist (Optional)</Label>
            <div className="space-y-2">
              <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a playlist" />
                </SelectTrigger>
                <SelectContent>
                  {playlists.map((playlist) => (
                    <SelectItem key={playlist.id} value={playlist.id}>
                      {playlist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setShowNewPlaylist((prev) => {
                    const next = !prev
                    if (next) {
                      setSelectedPlaylist("")
                    }
                    return next
                  })
                }
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Playlist
              </Button>
            </div>
          </div>

          {showNewPlaylist && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="playlist-name">Playlist Name</Label>
                <Input
                  id="playlist-name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Enter playlist name"
                />
              </div>
              <div>
                <Label htmlFor="playlist-description">Description (Optional)</Label>
                <Textarea
                  id="playlist-description"
                  value={newPlaylistDescription}
                  onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  placeholder="Describe your playlist"
                  rows={2}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Meditation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

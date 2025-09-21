"use client"

import type React from "react"

import { useState } from "react"
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
  const [title, setTitle] = useState(originalFileName.replace(/\.[^/.]+$/, ""))
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("")
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("")
  const [showNewPlaylist, setShowNewPlaylist] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[]>(() => MeditationLibrary.getAllPlaylists())
  const { toast } = useToast()

  const handleSave = async () => {
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

    try {
      console.log("[v0] Starting client-side audio compression...")

      // Fetch the audio blob
      const response = await fetch(audioUrl)
      const audioBlob = await response.blob()
      const originalSize = audioBlob.size
      console.log("[v0] Original audio size:", originalSize, "bytes")

      let processedBlob = audioBlob

      console.log("[v0] Compressing audio to ensure valid format...")

      try {
        // Use Web Audio API for proper compression
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const arrayBuffer = await audioBlob.arrayBuffer()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

        // Reduce quality: lower sample rate and convert to mono
        const targetSampleRate = originalSize > 10 * 1024 * 1024 ? 16000 : 22050 // More aggressive for larger files
        const channels = 1 // Convert to mono

        const length = Math.floor((audioBuffer.length * targetSampleRate) / audioBuffer.sampleRate)
        const offlineContext = new OfflineAudioContext(channels, length, targetSampleRate)

        const source = offlineContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(offlineContext.destination)
        source.start()

        const compressedBuffer = await offlineContext.startRendering()

        // Convert back to WAV blob
        const compressedBlob = await audioBufferToWav(compressedBuffer)

        console.log("[v0] Compressed from", originalSize, "to", compressedBlob.size, "bytes")
        processedBlob = compressedBlob

        await audioContext.close()
      } catch (compressionError) {
        console.log("[v0] Client compression failed, using original:", compressionError)
        // Fall back to original if compression fails
      }

      console.log("[v0] Attempting to save meditation with data:", {
        title: title.trim(),
        originalFileName,
        processedAudioUrl: "compressed-blob",
        duration,
        source,
        metadata,
      })

      // Create form data with the processed blob
      const formData = new FormData()
      formData.append("audio", processedBlob, `${title.trim()}.wav`)
      formData.append("title", title.trim())
      formData.append("originalFileName", originalFileName)
      formData.append("duration", duration.toString())
      formData.append("source", source)
      formData.append("metadata", JSON.stringify(metadata))

      // Send to simplified API endpoint
      const uploadResponse = await fetch("/api/save-meditation", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        const contentType = uploadResponse.headers.get("content-type")
        let errorMessage = "Upload failed"

        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await uploadResponse.json()
            errorMessage = errorData.error || errorMessage
          } catch (jsonError) {
            console.log("[v0] Failed to parse JSON error response:", jsonError)
            errorMessage = await uploadResponse.text()
          }
        } else {
          // Handle HTML error responses
          const errorText = await uploadResponse.text()
          console.log("[v0] Received HTML error response:", errorText.substring(0, 200))

          if (errorText.includes("bucket")) {
            errorMessage = "Storage bucket not configured. Please set up Supabase storage."
          } else if (errorText.includes("policy") || errorText.includes("permission")) {
            errorMessage = "Storage permission denied. Please check bucket policies."
          } else if (errorText.includes("size") || errorText.includes("too large")) {
            errorMessage = "File too large for storage."
          } else {
            errorMessage = "Storage service error. Please try again."
          }
        }

        throw new Error(errorMessage)
      }

      const savedMeditation = await uploadResponse.json()
      console.log("[v0] Meditation saved successfully with ID:", savedMeditation.id)

      let playlistId = selectedPlaylist
      if (showNewPlaylist && newPlaylistName.trim()) {
        console.log("[v0] Creating new playlist:", newPlaylistName.trim())
        const newPlaylist = MeditationLibrary.createPlaylist(newPlaylistName.trim(), newPlaylistDescription.trim())
        playlistId = newPlaylist.id
        setPlaylists(MeditationLibrary.getAllPlaylists())
        console.log("[v0] New playlist created with ID:", newPlaylist.id)
      }

      if (playlistId) {
        console.log("[v0] Adding meditation to playlist:", playlistId)
        MeditationLibrary.addToPlaylist(playlistId, savedMeditation.id)
        console.log("[v0] Added to playlist successfully")
      }

      const allMeditations = await MeditationLibrary.getAllMeditations()
      console.log("[v0] Verification: Total meditations after save:", allMeditations.length)
      console.log(
        "[v0] Verification: Can find saved meditation:",
        allMeditations.some((m) => m.id === savedMeditation.id),
      )

      console.log("[v0] Save process completed successfully")
      toast({
        title: "Meditation saved!",
        description: `"${title}" has been added to your library.`,
      })

      setTitle(originalFileName.replace(/\.[^/.]+$/, ""))
      setSelectedPlaylist("")
      setNewPlaylistName("")
      setNewPlaylistDescription("")
      setShowNewPlaylist(false)
      setOpen(false)
    } catch (error) {
      console.error("[v0] Save failed with error:", error)
      toast({
        title: "Save failed",
        description: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    }
  }

  const audioBufferToWav = async (buffer: AudioBuffer): Promise<Blob> => {
    const length = buffer.length
    const sampleRate = buffer.sampleRate
    const channels = buffer.numberOfChannels

    const arrayBuffer = new ArrayBuffer(44 + length * channels * 2)
    const view = new DataView(arrayBuffer)

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, "RIFF")
    view.setUint32(4, 36 + length * channels * 2, true)
    writeString(8, "WAVE")
    writeString(12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true) // PCM format
    view.setUint16(22, channels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * channels * 2, true) // byte rate
    view.setUint16(32, channels * 2, true) // block align
    view.setUint16(34, 16, true) // bits per sample
    writeString(36, "data")
    view.setUint32(40, length * channels * 2, true)

    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < channels; channel++) {
        // Get the float sample (-1 to 1) and convert to 16-bit integer
        const floatSample = buffer.getChannelData(channel)[i]
        const clampedSample = Math.max(-1, Math.min(1, floatSample))
        const intSample = Math.round(clampedSample * 32767)
        view.setInt16(offset, intSample, true)
        offset += 2
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Meditation to Library</DialogTitle>
        </DialogHeader>
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
                onClick={() => setShowNewPlaylist(!showNewPlaylist)}
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
            <Button onClick={handleSave}>Save Meditation</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

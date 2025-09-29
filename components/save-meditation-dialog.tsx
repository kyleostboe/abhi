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
import { bufferToMp3 } from "@/lib/audio-utils"
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

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your meditation.",
        variant: "destructive",
      })
      return
    }

    if (!audioUrl) {
      toast({
        title: "No audio to save",
        description: "There's no processed audio to save.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch(audioUrl)
      const audioBlob = await response.blob()
      const maxSizeBytes = 48 * 1024 * 1024
      const metadataForSave: Record<string, unknown> = { ...metadata }

      let distributionBlob: Blob
      let sourceBlob: Blob
      let processedDuration = duration

      let audioContext: AudioContext | null = null
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const arrayBuffer = await audioBlob.arrayBuffer()
        const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer)

        console.log("[v0] Creating dual-quality MP3 files...")

        console.log("[v0] Encoding high-quality source (192kbps)...")
        const sourceResult = await bufferToMp3(decodedBuffer, {
          bitrate: 192,
          onProgress: (progress) => {
            console.log(`[v0] Source encoding progress: ${Math.round(progress)}%`)
          },
        })
        sourceBlob = sourceResult.blob

        console.log("[v0] Encoding distribution quality (96kbps)...")
        const distributionResult = await bufferToMp3(decodedBuffer, {
          bitrate: 96,
          onProgress: (progress) => {
            console.log(`[v0] Distribution encoding progress: ${Math.round(progress)}%`)
          },
        })
        distributionBlob = distributionResult.blob

        processedDuration = decodedBuffer.duration

        console.log(
          `[v0] Encoding complete. Original: ${Math.round(audioBlob.size / 1024 / 1024)}MB, Source (192kbps): ${Math.round(sourceBlob.size / 1024 / 1024)}MB, Distribution (96kbps): ${Math.round(distributionBlob.size / 1024 / 1024)}MB`,
        )

        if (distributionBlob.size > maxSizeBytes) {
          throw new Error(
            `Distribution file too large (${Math.round(distributionBlob.size / 1024 / 1024)}MB). Unable to reduce below the 48MB library limit.`,
          )
        }

        if (sourceBlob.size > maxSizeBytes) {
          console.warn("[v0] Source file exceeds 48MB, will not be saved")
          sourceBlob = distributionBlob // Fallback to distribution quality
        }
      } finally {
        if (audioContext) {
          try {
            await audioContext.close()
          } catch (closeError) {
            console.warn("[v0] Error closing audio context:", closeError)
          }
        }
      }

      // ... existing code for metadata updates ...

      let distributionBlobUrl: string | null = null
      let sourceBlobUrl: string | null = null
      try {
        distributionBlobUrl = URL.createObjectURL(distributionBlob)
        sourceBlobUrl = URL.createObjectURL(sourceBlob)

        const savedMeditation = await MeditationLibrary.saveMeditation({
          title: title.trim(),
          originalFileName,
          processedAudioUrl: distributionBlobUrl,
          sourceAudioUrl: sourceBlobUrl,
          duration: processedDuration,
          source,
          metadata: metadataForSave as SavedMeditation["metadata"],
        })

        let playlistId = selectedPlaylist
        if (showNewPlaylist && newPlaylistName.trim()) {
          const newPlaylist = await MeditationLibrary.createPlaylist(
            newPlaylistName.trim(),
            newPlaylistDescription.trim(),
          )
          playlistId = newPlaylist.id
        }

        if (playlistId) {
          await MeditationLibrary.addToPlaylist(playlistId, savedMeditation.id)
        }

        await loadPlaylists()

        toast({
          title: "Meditation saved",
          description: `"${title.trim()}" is now available in your library with high-quality source for re-adjustments.`,
        })

        const baseTitle = metadataTitle || originalFileName
        setTitle(baseTitle.replace(/\.[^/.]+$/, ""))
        setSelectedPlaylist("")
        setNewPlaylistName("")
        setNewPlaylistDescription("")
        setShowNewPlaylist(false)
        setOpen(false)
      } finally {
        if (distributionBlobUrl) {
          URL.revokeObjectURL(distributionBlobUrl)
        }
        if (sourceBlobUrl) {
          URL.revokeObjectURL(sourceBlobUrl)
        }
      }
    } catch (error) {
      console.error("[v0] Save failed with error:", error)
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "An unknown error occurred while saving your meditation.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
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

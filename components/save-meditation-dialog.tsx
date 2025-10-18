"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
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
  mp3Blob?: Blob | null // Optional pre-generated distribution blob (e.g., WebM/MP3)
  originalFileName: string
  duration: number
  source: "adjuster" | "encoder"
  metadata: SavedMeditation["metadata"]
  children?: React.ReactNode
  existingMeditationId?: string | null
  existingMeditationTitle?: string | null
  existingMeditationDuration?: number | null
}

const formatDurationLabel = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "--"
  }

  const totalSeconds = Math.round(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`
  }
  if (hours > 0) {
    return `${hours}h`
  }
  return `${minutes}m`
}

const formatClockDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00"
  }

  const totalSeconds = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}

export function SaveMeditationDialog({
  audioUrl,
  mp3Blob, // Accept pre-created MP3
  originalFileName,
  duration,
  source,
  metadata,
  children,
  existingMeditationId,
  existingMeditationTitle,
  existingMeditationDuration,
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
  const [saveMode, setSaveMode] = useState<"preset" | "new">(
    existingMeditationId ? "preset" : "new",
  )
  const [presetLabel, setPresetLabel] = useState(() =>
    existingMeditationId ? formatDurationLabel(duration) : "",
  )
  const { toast } = useToast()
  const abortControllerRef = useRef<AbortController | null>(null)
  const isPresetOptionAvailable = Boolean(existingMeditationId)
  const effectiveOriginalDuration =
    typeof existingMeditationDuration === "number" && Number.isFinite(existingMeditationDuration)
      ? existingMeditationDuration
      : duration
  const presetLabelDisplay =
    presetLabel.trim().length > 0 ? presetLabel.trim() : formatDurationLabel(duration)
  const targetPresetTitle = (existingMeditationTitle ?? title).trim() || title

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

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
      setSaveMode(existingMeditationId ? "preset" : "new")
      setPresetLabel(existingMeditationId ? formatDurationLabel(duration) : "")
    }
  }, [open, originalFileName, metadataTitle, existingMeditationId, duration])

  const handleSave = async () => {
    if (isSaving) {
      return
    }

    const isPresetSave = saveMode === "preset" && isPresetOptionAvailable
    const trimmedPresetLabel = presetLabel.trim()

    if (!isPresetSave && !title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your meditation.",
        variant: "destructive",
      })
      return
    }

    if (isPresetSave && !trimmedPresetLabel) {
      toast({
        title: "Preset label required",
        description: "Add a label so you can recognize this duration in your library.",
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
    abortControllerRef.current = new AbortController()

    try {
      let distributionBlob: Blob

      if (mp3Blob) {
        console.log("[v0] Using pre-generated audio blob")
        distributionBlob = mp3Blob
      } else {
        console.log("[v0] No pre-created MP3, encoding now...")
        const response = await fetch(audioUrl)
        const audioBlob = await response.blob()

        let audioContext: AudioContext | null = null
        try {
          audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          const arrayBuffer = await audioBlob.arrayBuffer()
          const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer)

          const mp3Result = await bufferToMp3(decodedBuffer, {
            bitrate: 96,
            onProgress: (progress) => {
              // Progress tracking without console spam
            },
            signal: abortControllerRef.current.signal,
          })
          distributionBlob = mp3Result.blob

          console.log("[v0] MP3 encoding complete")
        } finally {
          if (audioContext) {
            try {
              await audioContext.close()
            } catch (closeError) {
              console.warn("[v0] Error closing audio context:", closeError)
            }
          }
        }
      }

      const maxSizeBytes = 48 * 1024 * 1024
      if (distributionBlob.size > maxSizeBytes) {
        throw new Error(
          `File too large (${Math.round(distributionBlob.size / 1024 / 1024)}MB). Unable to reduce below the 48MB library limit.`,
        )
      }

      console.log(`[v0] Saving meditation. File size: ${Math.round(distributionBlob.size / 1024 / 1024)}MB`)

      const metadataForSave: SavedMeditation["metadata"] = { ...metadata }
      const metadataRecord = metadataForSave as Record<string, unknown>

      const existingDurationId =
        typeof metadataForSave.quickAdjust?.lastDurationId === "string"
          ? metadataForSave.quickAdjust.lastDurationId.trim()
          : ""
      const generatedDurationId = existingDurationId.length > 0
        ? existingDurationId
        : `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

      if (isPresetSave) {
        metadataForSave.quickAdjust = {
          ...(metadataForSave.quickAdjust ?? {}),
          lastDurationId: generatedDurationId,
        }
        metadataRecord.linkedParentId = existingMeditationId as string
        metadataRecord.linkedVariantLabel = trimmedPresetLabel
        metadataRecord.linkedDurationId = generatedDurationId
        metadataRecord.linkedIsPreset = true
        metadataRecord.originalDurationSeconds = Math.round(effectiveOriginalDuration)

        if (
          typeof metadataRecord.meditationTitle !== "string" ||
          (metadataRecord.meditationTitle as string).trim().length === 0
        ) {
          metadataRecord.meditationTitle = existingMeditationTitle ?? title
        }
      } else {
        delete metadataRecord.linkedParentId
        delete metadataRecord.linkedVariantLabel
        delete metadataRecord.linkedDurationId
        delete metadataRecord.linkedIsPreset
        delete metadataRecord.originalDurationSeconds
      }

      const trimmedTitle = title.trim()
      const baseTitle = (metadataTitle || originalFileName).replace(/\.[^/.]+$/, "").trim()
      const titleToSave = isPresetSave
        ? (existingMeditationTitle?.trim() || trimmedTitle || baseTitle)
        : trimmedTitle || baseTitle

      let distributionBlobUrl: string | null = null
      try {
        distributionBlobUrl = URL.createObjectURL(distributionBlob)

        const savedMeditation = await MeditationLibrary.saveMeditation({
          title: titleToSave,
          originalFileName,
          processedAudioUrl: distributionBlobUrl,
          processedAudioData: distributionBlob,
          sourceAudioUrl: distributionBlobUrl, // TODO: Save master file separately on upload
          sourceAudioData: distributionBlob,
          duration,
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
          title: isPresetSave ? "Preset saved" : "Meditation saved",
          description: isPresetSave
            ? `"${trimmedPresetLabel}" has been added to "${titleToSave}".`
            : `"${titleToSave}" is now available in your library.`,
        })

        const baseTitle = metadataTitle || originalFileName
        setTitle(baseTitle.replace(/\.[^/.]+$/, ""))
        setPresetLabel(isPresetOptionAvailable ? formatDurationLabel(duration) : "")
        setSaveMode(isPresetOptionAvailable ? saveMode : "new")
        setSelectedPlaylist("")
        setNewPlaylistName("")
        setNewPlaylistDescription("")
        setShowNewPlaylist(false)
        setOpen(false)
      } finally {
        if (distributionBlobUrl) {
          URL.revokeObjectURL(distributionBlobUrl)
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Encoding aborted") {
        console.log("[v0] Encoding was cancelled")
        return
      }

      console.error("[v0] Save failed with error:", error)
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "An unknown error occurred while saving your meditation.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
      abortControllerRef.current = null
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
          {isPresetOptionAvailable && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-gray-500">Save option</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={saveMode === "preset" ? "default" : "outline"}
                  onClick={() => setSaveMode("preset")}
                  className="w-full"
                >
                  Attach to "{targetPresetTitle}"
                </Button>
                <Button
                  type="button"
                  variant={saveMode === "new" ? "default" : "outline"}
                  onClick={() => setSaveMode("new")}
                  className="w-full"
                >
                  Save as new meditation
                </Button>
              </div>
              {saveMode === "preset" && (
                <p className="text-xs text-gray-500">
                  This preset will appear alongside the original meditation in your library card.
                </p>
              )}
            </div>
          )}

          {saveMode === "preset" ? (
            <div className="space-y-2">
              <Label htmlFor="preset-label">Preset label</Label>
              <Input
                id="preset-label"
                value={presetLabel}
                onChange={(e) => setPresetLabel(e.target.value)}
                placeholder="e.g. 30m"
              />
              <p className="text-xs text-gray-500">
                Displayed as Original ({formatClockDuration(effectiveOriginalDuration)}), {presetLabelDisplay} (
                {formatClockDuration(duration)}).
              </p>
            </div>
          ) : (
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter meditation title"
              />
            </div>
          )}

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

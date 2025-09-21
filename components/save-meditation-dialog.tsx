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
      console.log("[v0] Attempting to save meditation with data:", {
        title: title.trim(),
        originalFileName,
        processedAudioUrl: audioUrl,
        duration,
        source,
        metadata,
      })

      const savedMeditation = await MeditationLibrary.saveMeditation({
        title: title.trim(),
        originalFileName,
        processedAudioUrl: audioUrl,
        duration,
        source,
        metadata,
      })

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

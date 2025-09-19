"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MeditationLibrary, type SavedMeditation, type Playlist } from "@/lib/meditation-library"
import { Trash2, Music, Clock, Calendar, FolderPlus, Edit2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"

export default function LibraryPage() {
  const [meditations, setMeditations] = useState<SavedMeditation[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [activeTab, setActiveTab] = useState<"meditations" | "playlists">("meditations")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null)
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("")
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setMeditations(MeditationLibrary.getAllMeditations())
    setPlaylists(MeditationLibrary.getAllPlaylists())
  }

  const filteredMeditations = meditations.filter(
    (med) =>
      med.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.originalFileName.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const displayedMeditations = selectedPlaylist
    ? MeditationLibrary.getPlaylistMeditations(selectedPlaylist)
    : filteredMeditations

  const handlePlay = (meditationId: string) => {
    if (currentlyPlaying === meditationId) {
      setCurrentlyPlaying(null)
    } else {
      setCurrentlyPlaying(meditationId)
    }
  }

  const handleDelete = (meditationId: string) => {
    MeditationLibrary.deleteMeditation(meditationId)
    loadData()
    toast({
      title: "Meditation deleted",
      description: "The meditation has been removed from your library.",
    })
  }

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return

    MeditationLibrary.createPlaylist(newPlaylistName.trim(), newPlaylistDescription.trim())
    setNewPlaylistName("")
    setNewPlaylistDescription("")
    loadData()
    toast({
      title: "Playlist created",
      description: `"${newPlaylistName}" has been added to your playlists.`,
    })
  }

  const handleUpdatePlaylist = () => {
    if (!editingPlaylist || !editingPlaylist.name.trim()) return

    MeditationLibrary.updatePlaylist(editingPlaylist.id, {
      name: editingPlaylist.name,
      description: editingPlaylist.description,
    })
    setEditingPlaylist(null)
    loadData()
    toast({
      title: "Playlist updated",
      description: "Your playlist has been updated successfully.",
    })
  }

  const handleDeletePlaylist = (playlistId: string) => {
    MeditationLibrary.deletePlaylist(playlistId)
    if (selectedPlaylist === playlistId) {
      setSelectedPlaylist(null)
    }
    loadData()
    toast({
      title: "Playlist deleted",
      description: "The playlist has been removed from your library.",
    })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8 md:pt-0">
      <Navigation />

      <div
        className="relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden transition-colors duration-300 ease-in-out"
        style={{
          borderRadius: "4rem 3rem 2rem 1rem",
        }}
      >
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20"></div>
          </div>
          <div className="relative text-center px-8 pt-16 pb-8">
            {/* Custom underline matching home page but larger */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="flex justify-center items-center space-x-[4px]">
                  <div className="bg-gradient-to-br from-logo-teal to-logo-emerald rounded-sm transform rotate-12 w-[16px] h-[16px]"></div>
                  <div className="bg-gradient-to-br from-logo-rose to-pink-300 rounded-full h-[11px] w-[11px]"></div>
                  <div className="w-5 bg-gradient-to-br from-logo-amber to-orange-300 rounded-sm transform -rotate-6 h-[11px]"></div>
                  <div className="bg-gradient-to-r from-gray-600 to-gray-500 px-0 mx-0 rounded-sm w-[64px] text-logo-rose-600 border-0 bg-gray-600 h-[6px]"></div>
                  <div className="w-5 bg-gradient-to-br from-logo-purple to-indigo-300 rounded-sm transform rotate-6 h-[11px] pl-0 ml-2"></div>
                  <div className="bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full h-[11px] w-[11px]"></div>
                  <div className="bg-gradient-to-br from-logo-emerald to-logo-teal rounded-sm transform -rotate-12 w-[16px] h-[16px]"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 md:px-10 pb-10">
            {/* Tab Navigation */}
            <div className="flex justify-center mb-6">
              <div className="flex p-1 bg-muted rounded-lg">
                <button
                  onClick={() => setActiveTab("meditations")}
                  className={`px-6 py-2 rounded-md font-semibold transition-all ${
                    activeTab === "meditations"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Meditations ({meditations.length})
                </button>
                <button
                  onClick={() => setActiveTab("playlists")}
                  className={`px-6 py-2 rounded-md font-semibold transition-all ${
                    activeTab === "playlists" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Playlists ({playlists.length})
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "meditations" && (
                <motion.div
                  key="meditations"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Search and Filters */}
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <Input
                        placeholder="Search meditations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={selectedPlaylist ? "default" : "outline"}
                        onClick={() => setSelectedPlaylist(null)}
                      >
                        All Meditations
                      </Button>
                      {playlists.map((playlist) => (
                        <Button
                          key={playlist.id}
                          variant={selectedPlaylist === playlist.id ? "default" : "outline"}
                          onClick={() => setSelectedPlaylist(playlist.id)}
                        >
                          {playlist.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Meditations Grid */}
                  {displayedMeditations.length === 0 ? (
                    <Card className="p-12 text-center">
                      <Music className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">
                        {selectedPlaylist ? "No meditations in this playlist" : "No meditations saved yet"}
                      </h3>
                      <p className="text-gray-500 mb-4">
                        {selectedPlaylist
                          ? "Add some meditations to this playlist to get started."
                          : "Create your first meditation using the Adjuster or Encoder tools."}
                      </p>
                      <Button asChild>
                        <a href="/">Go to Tools</a>
                      </Button>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {displayedMeditations.map((meditation) => (
                        <Card key={meditation.id} className="hover:shadow-lg transition-shadow">
                          {meditation.source === "adjuster" ? (
                            // Old processed audio card design with new features
                            <div className="p-6 bg-white shadow-lg border border-gray-200">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg mb-1 line-clamp-2">{meditation.title}</h3>
                                  <p className="text-sm text-gray-500 mb-2">{meditation.originalFileName}</p>
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatDuration(meditation.duration)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {formatDate(meditation.createdAt)}
                                    </span>
                                  </div>
                                </div>
                                <Badge variant="default">{meditation.source}</Badge>
                              </div>

                              <div className="space-y-3">
                                <audio
                                  controls
                                  className="w-full"
                                  src={meditation.processedAudioUrl}
                                  onPlay={() => setCurrentlyPlaying(meditation.id)}
                                  onPause={() => setCurrentlyPlaying(null)}
                                />

                                <div className="flex justify-between items-center">
                                  <div className="text-xs text-gray-500">
                                    {meditation.metadata.pausesAdjusted && (
                                      <span>{meditation.metadata.pausesAdjusted} pauses adjusted</span>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(meditation.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Generated audio card design with new features
                            <div className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-gray-50 to-muted">
                              <div className="bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 py-3 px-6">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-white font-black">{meditation.title}</h3>
                                  <Badge variant="secondary" className="bg-white/20 text-white">
                                    {meditation.source}
                                  </Badge>
                                </div>
                              </div>
                              <div className="p-6 px-3.5 py-4">
                                <div className="bg-white p-3 rounded-sm shadow-md mb-3.5 px-0">
                                  <audio
                                    controls
                                    className="w-full"
                                    src={meditation.processedAudioUrl}
                                    onPlay={() => setCurrentlyPlaying(meditation.id)}
                                    onPause={() => setCurrentlyPlaying(null)}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3.5">
                                  <div className="p-3 rounded-lg text-center bg-white shadow-md py-3.5">
                                    <div className="text-xs uppercase tracking-wide mb-1 text-gray-500">Duration</div>
                                    <div className="font-black text-gray-600 text-sm">
                                      {formatDuration(meditation.duration)}
                                    </div>
                                  </div>
                                  <div className="p-3 rounded-lg text-center bg-white shadow-md py-3.5">
                                    <div className="text-xs uppercase tracking-wide mb-1 text-gray-500">Created</div>
                                    <div className="font-black text-sm text-gray-600">
                                      {formatDate(meditation.createdAt)}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center">
                                  <div className="text-xs text-gray-500">
                                    <p className="text-sm text-gray-600 mb-1">{meditation.originalFileName}</p>
                                    {meditation.metadata.instructionCount && (
                                      <span>{meditation.metadata.instructionCount} instructions</span>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(meditation.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "playlists" && (
                <motion.div
                  key="playlists"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Create Playlist Button */}
                  <div className="mb-6">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-logo-purple-500 to-logo-rose-400 hover:from-logo-purple-600 hover:to-logo-rose-500 text-white">
                          <FolderPlus className="w-4 h-4 mr-2" />
                          Create Playlist
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Playlist</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="playlist-name">Name</Label>
                            <Input
                              id="playlist-name"
                              value={newPlaylistName}
                              onChange={(e) => setNewPlaylistName(e.target.value)}
                              placeholder="Enter playlist name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="playlist-description">Description</Label>
                            <Textarea
                              id="playlist-description"
                              value={newPlaylistDescription}
                              onChange={(e) => setNewPlaylistDescription(e.target.value)}
                              placeholder="Describe your playlist"
                              rows={3}
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline">Cancel</Button>
                            <Button onClick={handleCreatePlaylist}>Create Playlist</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Playlists Grid */}
                  {playlists.length === 0 ? (
                    <Card className="p-12 text-center">
                      <FolderPlus className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">No playlists created yet</h3>
                      <p className="text-gray-500 mb-4">Create your first playlist to organize your meditations.</p>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {playlists.map((playlist) => {
                        const playlistMeditations = MeditationLibrary.getPlaylistMeditations(playlist.id)
                        const totalDuration = playlistMeditations.reduce((sum, med) => sum + med.duration, 0)

                        return (
                          <Card key={playlist.id} className="p-6 hover:shadow-lg transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg mb-1">{playlist.name}</h3>
                                {playlist.description && (
                                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{playlist.description}</p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span>{playlistMeditations.length} meditations</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDuration(totalDuration)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setActiveTab("meditations")
                                  setSelectedPlaylist(playlist.id)
                                }}
                              >
                                View Meditations
                              </Button>
                              <div className="flex gap-1">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => setEditingPlaylist(playlist)}>
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Edit Playlist</DialogTitle>
                                    </DialogHeader>
                                    {editingPlaylist && (
                                      <div className="space-y-4">
                                        <div>
                                          <Label htmlFor="edit-name">Name</Label>
                                          <Input
                                            id="edit-name"
                                            value={editingPlaylist.name}
                                            onChange={(e) =>
                                              setEditingPlaylist({
                                                ...editingPlaylist,
                                                name: e.target.value,
                                              })
                                            }
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-description">Description</Label>
                                          <Textarea
                                            id="edit-description"
                                            value={editingPlaylist.description}
                                            onChange={(e) =>
                                              setEditingPlaylist({
                                                ...editingPlaylist,
                                                description: e.target.value,
                                              })
                                            }
                                            rows={3}
                                          />
                                        </div>
                                        <div className="flex justify-end space-x-2">
                                          <Button variant="outline" onClick={() => setEditingPlaylist(null)}>
                                            Cancel
                                          </Button>
                                          <Button onClick={handleUpdatePlaylist}>Update Playlist</Button>
                                        </div>
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeletePlaylist(playlist.id)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

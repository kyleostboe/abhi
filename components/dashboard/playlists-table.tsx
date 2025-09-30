"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Pencil, Trash2, ListMusic, Music } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Playlist {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

interface PlaylistWithMeditations extends Playlist {
  meditationCount: number
}

interface Meditation {
  id: string
  title: string
  duration: number
}

export function PlaylistsTable() {
  const [playlists, setPlaylists] = useState<PlaylistWithMeditations[]>([])
  const [filteredPlaylists, setFilteredPlaylists] = useState<PlaylistWithMeditations[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isManageMeditationsOpen, setIsManageMeditationsOpen] = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistWithMeditations | null>(null)
  const [allMeditations, setAllMeditations] = useState<Meditation[]>([])
  const [playlistMeditations, setPlaylistMeditations] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchPlaylists()
    fetchAllMeditations()

    const supabase = createClient()
    const playlistsChannel = supabase
      .channel("playlists-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "playlists" }, () => {
        fetchPlaylists()
      })
      .subscribe()

    const playlistMeditationsChannel = supabase
      .channel("playlist-meditations-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "playlist_meditations" }, () => {
        fetchPlaylists()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(playlistsChannel)
      supabase.removeChannel(playlistMeditationsChannel)
    }
  }, [])

  useEffect(() => {
    const filtered = playlists.filter(
      (p) =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    setFilteredPlaylists(filtered)
  }, [searchQuery, playlists])

  async function fetchPlaylists() {
    const supabase = createClient()
    const { data, error } = await supabase.from("playlists").select("*").order("created_at", { ascending: false })

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch playlists",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    // Fetch meditation counts for each playlist
    const playlistsWithCounts = await Promise.all(
      (data || []).map(async (playlist) => {
        const { count } = await supabase
          .from("playlist_meditations")
          .select("*", { count: "exact", head: true })
          .eq("playlist_id", playlist.id)

        return {
          ...playlist,
          meditationCount: count || 0,
        }
      }),
    )

    setPlaylists(playlistsWithCounts)
    setFilteredPlaylists(playlistsWithCounts)
    setLoading(false)
  }

  async function fetchAllMeditations() {
    const supabase = createClient()
    const { data } = await supabase.from("meditations").select("id, title, duration").order("title")
    setAllMeditations(data || [])
  }

  async function fetchPlaylistMeditations(playlistId: string) {
    const supabase = createClient()
    const { data } = await supabase.from("playlist_meditations").select("meditation_id").eq("playlist_id", playlistId)

    setPlaylistMeditations(data?.map((pm) => pm.meditation_id) || [])
  }

  async function handleCreate() {
    const supabase = createClient()
    const { error } = await supabase.from("playlists").insert([
      {
        name: formData.name,
        description: formData.description || null,
      },
    ])

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create playlist",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Playlist created successfully",
      })
      setIsCreateOpen(false)
      setFormData({ name: "", description: "" })
      fetchPlaylists()
    }
  }

  async function handleUpdate() {
    if (!selectedPlaylist) return

    const supabase = createClient()
    const { error } = await supabase
      .from("playlists")
      .update({
        name: formData.name,
        description: formData.description || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedPlaylist.id)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update playlist",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Playlist updated successfully",
      })
      setIsEditOpen(false)
      setSelectedPlaylist(null)
      fetchPlaylists()
    }
  }

  async function handleDelete() {
    if (!selectedPlaylist) return

    const supabase = createClient()

    // First delete all playlist_meditations entries
    await supabase.from("playlist_meditations").delete().eq("playlist_id", selectedPlaylist.id)

    // Then delete the playlist
    const { error } = await supabase.from("playlists").delete().eq("id", selectedPlaylist.id)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete playlist",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Playlist deleted successfully",
      })
      setIsDeleteOpen(false)
      setSelectedPlaylist(null)
      fetchPlaylists()
    }
  }

  async function handleSaveMeditations() {
    if (!selectedPlaylist) return

    const supabase = createClient()

    // Delete existing associations
    await supabase.from("playlist_meditations").delete().eq("playlist_id", selectedPlaylist.id)

    // Insert new associations
    if (playlistMeditations.length > 0) {
      const { error } = await supabase.from("playlist_meditations").insert(
        playlistMeditations.map((meditationId) => ({
          playlist_id: selectedPlaylist.id,
          meditation_id: meditationId,
        })),
      )

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update playlist meditations",
          variant: "destructive",
        })
        return
      }
    }

    toast({
      title: "Success",
      description: "Playlist meditations updated successfully",
    })
    setIsManageMeditationsOpen(false)
    fetchPlaylists()
  }

  function openEditDialog(playlist: PlaylistWithMeditations) {
    setSelectedPlaylist(playlist)
    setFormData({
      name: playlist.name || "",
      description: playlist.description || "",
    })
    setIsEditOpen(true)
  }

  function openDeleteDialog(playlist: PlaylistWithMeditations) {
    setSelectedPlaylist(playlist)
    setIsDeleteOpen(true)
  }

  async function openManageMeditationsDialog(playlist: PlaylistWithMeditations) {
    setSelectedPlaylist(playlist)
    await fetchPlaylistMeditations(playlist.id)
    setIsManageMeditationsOpen(true)
  }

  function toggleMeditation(meditationId: string) {
    setPlaylistMeditations((prev) =>
      prev.includes(meditationId) ? prev.filter((id) => id !== meditationId) : [...prev, meditationId],
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 bg-neutral-800" />
        <Skeleton className="h-96 bg-neutral-800" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Playlists</h1>
          <p className="mt-2 text-neutral-400">Organize meditations into curated collections</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Create Playlist
            </Button>
          </DialogTrigger>
          <DialogContent className="border-neutral-800 bg-neutral-900 text-white">
            <DialogHeader>
              <DialogTitle>Create New Playlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-neutral-200">
                  Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border-neutral-700 bg-neutral-950 text-white"
                  placeholder="Morning Routine"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-neutral-200">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="border-neutral-700 bg-neutral-950 text-white"
                  placeholder="A collection of meditations for starting your day..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="border-neutral-700">
                Cancel
              </Button>
              <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <Input
              placeholder="Search playlists by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-neutral-700 bg-neutral-950 pl-10 text-white placeholder:text-neutral-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-white">All Playlists ({filteredPlaylists.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-800 hover:bg-neutral-800/50">
                  <TableHead className="text-neutral-400">Name</TableHead>
                  <TableHead className="text-neutral-400">Meditations</TableHead>
                  <TableHead className="text-neutral-400">Created</TableHead>
                  <TableHead className="text-right text-neutral-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlaylists.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-neutral-500">
                      No playlists found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlaylists.map((playlist) => (
                    <TableRow key={playlist.id} className="border-neutral-800 hover:bg-neutral-800/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                            <ListMusic className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{playlist.name || "Untitled"}</p>
                            {playlist.description && (
                              <p className="text-sm text-neutral-500">{playlist.description.slice(0, 50)}...</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="rounded-full bg-purple-500/10 px-3 py-1 text-sm text-purple-400">
                          {playlist.meditationCount} items
                        </span>
                      </TableCell>
                      <TableCell className="text-neutral-400">
                        {new Date(playlist.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-neutral-400 hover:text-white"
                            onClick={() => openManageMeditationsDialog(playlist)}
                          >
                            <Music className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-neutral-400 hover:text-white"
                            onClick={() => openEditDialog(playlist)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-neutral-400 hover:text-red-400"
                            onClick={() => openDeleteDialog(playlist)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="border-neutral-800 bg-neutral-900 text-white">
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name" className="text-neutral-200">
                Name
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border-neutral-700 bg-neutral-950 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit-description" className="text-neutral-200">
                Description
              </Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="border-neutral-700 bg-neutral-950 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-neutral-700">
              Cancel
            </Button>
            <Button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Meditations Dialog */}
      <Dialog open={isManageMeditationsOpen} onOpenChange={setIsManageMeditationsOpen}>
        <DialogContent className="max-w-2xl border-neutral-800 bg-neutral-900 text-white">
          <DialogHeader>
            <DialogTitle>Manage Meditations - {selectedPlaylist?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-96">
            <div className="space-y-2 pr-4">
              {allMeditations.length === 0 ? (
                <p className="text-center text-neutral-500">No meditations available</p>
              ) : (
                allMeditations.map((meditation) => (
                  <div
                    key={meditation.id}
                    className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950 p-3"
                  >
                    <Checkbox
                      checked={playlistMeditations.includes(meditation.id)}
                      onCheckedChange={() => toggleMeditation(meditation.id)}
                      className="border-neutral-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-white">{meditation.title}</p>
                      <p className="text-sm text-neutral-500">
                        {Math.floor(meditation.duration / 60)}:{String(meditation.duration % 60).padStart(2, "0")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageMeditationsOpen(false)} className="border-neutral-700">
              Cancel
            </Button>
            <Button onClick={handleSaveMeditations} className="bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="border-neutral-800 bg-neutral-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              This will permanently delete "{selectedPlaylist?.name}" and remove all meditation associations. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-neutral-700 bg-neutral-950 text-white hover:bg-neutral-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

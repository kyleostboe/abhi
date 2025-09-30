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
import { Search, Plus, Pencil, Trash2, Music, Play } from "lucide-react"
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

interface Meditation {
  id: string
  title: string
  description: string | null
  duration: number
  audio_url: string | null
  source_audio_url: string | null
  source: string | null
  created_at: string
  updated_at: string
}

export function MeditationsTable() {
  const [meditations, setMeditations] = useState<Meditation[]>([])
  const [filteredMeditations, setFilteredMeditations] = useState<Meditation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedMeditation, setSelectedMeditation] = useState<Meditation | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: 0,
    audio_url: "",
    source: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchMeditations()

    const supabase = createClient()
    const channel = supabase
      .channel("meditations-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "meditations" }, () => {
        fetchMeditations()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const filtered = meditations.filter(
      (m) =>
        m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.source?.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    setFilteredMeditations(filtered)
  }, [searchQuery, meditations])

  async function fetchMeditations() {
    const supabase = createClient()
    const { data, error } = await supabase.from("meditations").select("*").order("created_at", { ascending: false })

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch meditations",
        variant: "destructive",
      })
    } else {
      setMeditations(data || [])
      setFilteredMeditations(data || [])
    }
    setLoading(false)
  }

  async function handleCreate() {
    const supabase = createClient()
    const { error } = await supabase.from("meditations").insert([
      {
        title: formData.title,
        description: formData.description || null,
        duration: formData.duration,
        audio_url: formData.audio_url || null,
        source: formData.source || null,
      },
    ])

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create meditation",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Meditation created successfully",
      })
      setIsCreateOpen(false)
      setFormData({ title: "", description: "", duration: 0, audio_url: "", source: "" })
      fetchMeditations()
    }
  }

  async function handleUpdate() {
    if (!selectedMeditation) return

    const supabase = createClient()
    const { error } = await supabase
      .from("meditations")
      .update({
        title: formData.title,
        description: formData.description || null,
        duration: formData.duration,
        audio_url: formData.audio_url || null,
        source: formData.source || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedMeditation.id)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update meditation",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Meditation updated successfully",
      })
      setIsEditOpen(false)
      setSelectedMeditation(null)
      fetchMeditations()
    }
  }

  async function handleDelete() {
    if (!selectedMeditation) return

    const supabase = createClient()
    const { error } = await supabase.from("meditations").delete().eq("id", selectedMeditation.id)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete meditation",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Meditation deleted successfully",
      })
      setIsDeleteOpen(false)
      setSelectedMeditation(null)
      fetchMeditations()
    }
  }

  function openEditDialog(meditation: Meditation) {
    setSelectedMeditation(meditation)
    setFormData({
      title: meditation.title || "",
      description: meditation.description || "",
      duration: meditation.duration || 0,
      audio_url: meditation.audio_url || "",
      source: meditation.source || "",
    })
    setIsEditOpen(true)
  }

  function openDeleteDialog(meditation: Meditation) {
    setSelectedMeditation(meditation)
    setIsDeleteOpen(true)
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
          <h1 className="text-3xl font-bold text-white">Meditations</h1>
          <p className="mt-2 text-neutral-400">Manage your meditation audio library</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Meditation
            </Button>
          </DialogTrigger>
          <DialogContent className="border-neutral-800 bg-neutral-900 text-white">
            <DialogHeader>
              <DialogTitle>Create New Meditation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-neutral-200">
                  Title
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="border-neutral-700 bg-neutral-950 text-white"
                  placeholder="Morning Meditation"
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
                  placeholder="A calming meditation for starting your day..."
                />
              </div>
              <div>
                <Label htmlFor="duration" className="text-neutral-200">
                  Duration (seconds)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Number.parseInt(e.target.value) || 0 })}
                  className="border-neutral-700 bg-neutral-950 text-white"
                />
              </div>
              <div>
                <Label htmlFor="audio_url" className="text-neutral-200">
                  Audio URL
                </Label>
                <Input
                  id="audio_url"
                  value={formData.audio_url}
                  onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })}
                  className="border-neutral-700 bg-neutral-950 text-white"
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="source" className="text-neutral-200">
                  Source
                </Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="border-neutral-700 bg-neutral-950 text-white"
                  placeholder="adjuster, encoder, etc."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="border-neutral-700">
                Cancel
              </Button>
              <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">
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
              placeholder="Search meditations by title, description, or source..."
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
          <CardTitle className="text-white">All Meditations ({filteredMeditations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-800 hover:bg-neutral-800/50">
                  <TableHead className="text-neutral-400">Title</TableHead>
                  <TableHead className="text-neutral-400">Duration</TableHead>
                  <TableHead className="text-neutral-400">Source</TableHead>
                  <TableHead className="text-neutral-400">Created</TableHead>
                  <TableHead className="text-right text-neutral-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeditations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-neutral-500">
                      No meditations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMeditations.map((meditation) => (
                    <TableRow key={meditation.id} className="border-neutral-800 hover:bg-neutral-800/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                            <Music className="h-5 w-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{meditation.title || "Untitled"}</p>
                            {meditation.description && (
                              <p className="text-sm text-neutral-500">{meditation.description.slice(0, 50)}...</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-neutral-300">
                        {Math.floor(meditation.duration / 60)}:{String(meditation.duration % 60).padStart(2, "0")}
                      </TableCell>
                      <TableCell>
                        <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-400">
                          {meditation.source || "unknown"}
                        </span>
                      </TableCell>
                      <TableCell className="text-neutral-400">
                        {new Date(meditation.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {meditation.audio_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-neutral-400 hover:text-white"
                              onClick={() => window.open(meditation.audio_url!, "_blank")}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-neutral-400 hover:text-white"
                            onClick={() => openEditDialog(meditation)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-neutral-400 hover:text-red-400"
                            onClick={() => openDeleteDialog(meditation)}
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
            <DialogTitle>Edit Meditation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title" className="text-neutral-200">
                Title
              </Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
            <div>
              <Label htmlFor="edit-duration" className="text-neutral-200">
                Duration (seconds)
              </Label>
              <Input
                id="edit-duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number.parseInt(e.target.value) || 0 })}
                className="border-neutral-700 bg-neutral-950 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit-audio_url" className="text-neutral-200">
                Audio URL
              </Label>
              <Input
                id="edit-audio_url"
                value={formData.audio_url}
                onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })}
                className="border-neutral-700 bg-neutral-950 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit-source" className="text-neutral-200">
                Source
              </Label>
              <Input
                id="edit-source"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="border-neutral-700 bg-neutral-950 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-neutral-700">
              Cancel
            </Button>
            <Button onClick={handleUpdate} className="bg-emerald-600 hover:bg-emerald-700">
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
              This will permanently delete "{selectedMeditation?.title}". This action cannot be undone.
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

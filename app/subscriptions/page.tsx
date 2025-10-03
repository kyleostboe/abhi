"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/navigation"
import { Trash2, Music, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
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

interface Playlist {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  meditation_count?: number
}

export default function SubscriptionsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [playlistToDelete, setPlaylistToDelete] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchPlaylists()
  }, [])

  async function fetchPlaylists() {
    try {
      setLoading(true)

      // Fetch playlists with meditation count
      const { data: playlistsData, error: playlistsError } = await supabase
        .from("playlists")
        .select("*")
        .order("created_at", { ascending: false })

      if (playlistsError) throw playlistsError

      // Fetch meditation counts for each playlist
      const playlistsWithCounts = await Promise.all(
        (playlistsData || []).map(async (playlist) => {
          const { count } = await supabase
            .from("playlist_meditations")
            .select("*", { count: "exact", head: true })
            .eq("playlist_id", playlist.id)

          return {
            ...playlist,
            meditation_count: count || 0,
          }
        }),
      )

      setPlaylists(playlistsWithCounts)
    } catch (error) {
      console.error("Error fetching playlists:", error)
      toast({
        title: "Error",
        description: "Failed to load your playlists. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDeletePlaylist(playlistId: string) {
    try {
      // First delete all playlist_meditations entries
      const { error: deleteRelationsError } = await supabase
        .from("playlist_meditations")
        .delete()
        .eq("playlist_id", playlistId)

      if (deleteRelationsError) throw deleteRelationsError

      // Then delete the playlist
      const { error: deletePlaylistError } = await supabase.from("playlists").delete().eq("id", playlistId)

      if (deletePlaylistError) throw deletePlaylistError

      toast({
        title: "Success",
        description: "Playlist deleted successfully.",
      })

      // Refresh the list
      fetchPlaylists()
    } catch (error) {
      console.error("Error deleting playlist:", error)
      toast({
        title: "Error",
        description: "Failed to delete playlist. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setPlaylistToDelete(null)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <Navigation />

      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-black font-serif text-gray-800 mb-2">Manage Subscriptions</h1>
          <p className="text-gray-600 leading-relaxed">View and manage your saved meditation playlists</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-600 border-r-transparent mb-4"></div>
              <p className="text-gray-600 font-serif">Loading your playlists...</p>
            </div>
          </div>
        ) : playlists.length === 0 ? (
          <Card className="shadow-lg border-2 border-gray-200">
            <CardContent className="py-20 text-center">
              <Music className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-black font-serif text-gray-700 mb-2">No playlists yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first playlist to get started with organizing your meditations.
              </p>
              <Button
                onClick={() => (window.location.href = "/library")}
                className="bg-gradient-to-r from-gray-600 to-gray-500 text-white font-black font-serif shadow-md hover:shadow-lg transition-all"
              >
                Go to Library
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {playlists.map((playlist) => (
              <Card key={playlist.id} className="shadow-lg border-2 border-gray-200 hover:shadow-xl transition-shadow">
                <CardHeader>
                  <CardTitle className="font-black font-serif text-gray-800 text-lg">{playlist.name}</CardTitle>
                  {playlist.description && (
                    <CardDescription className="text-gray-600 leading-relaxed">{playlist.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Music className="h-4 w-4 mr-2" />
                      <span className="font-serif">
                        {playlist.meditation_count} {playlist.meditation_count === 1 ? "meditation" : "meditations"}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span className="font-serif">Created {formatDate(playlist.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 font-black font-serif text-sm border-2 border-gray-300 hover:bg-gray-100 bg-transparent"
                      onClick={() => (window.location.href = `/library?playlist=${playlist.id}`)}
                    >
                      View
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="shadow-md hover:shadow-lg transition-all"
                      onClick={() => {
                        setPlaylistToDelete(playlist.id)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black font-serif">Delete Playlist?</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              This action cannot be undone. This will permanently delete the playlist and remove all meditations from
              it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-black font-serif">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => playlistToDelete && handleDeletePlaylist(playlistToDelete)}
              className="bg-red-600 hover:bg-red-700 font-black font-serif"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

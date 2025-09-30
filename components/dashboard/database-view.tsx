"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Database, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TableData {
  [key: string]: any
}

export function DatabaseView() {
  const [meditations, setMeditations] = useState<TableData[]>([])
  const [playlists, setPlaylists] = useState<TableData[]>([])
  const [playlistMeditations, setPlaylistMeditations] = useState<TableData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAllData()

    // Set up real-time subscriptions
    const supabase = createClient()
    const meditationsChannel = supabase
      .channel("db-meditations")
      .on("postgres_changes", { event: "*", schema: "public", table: "meditations" }, () => {
        fetchAllData()
      })
      .subscribe()

    const playlistsChannel = supabase
      .channel("db-playlists")
      .on("postgres_changes", { event: "*", schema: "public", table: "playlists" }, () => {
        fetchAllData()
      })
      .subscribe()

    const playlistMeditationsChannel = supabase
      .channel("db-playlist-meditations")
      .on("postgres_changes", { event: "*", schema: "public", table: "playlist_meditations" }, () => {
        fetchAllData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(meditationsChannel)
      supabase.removeChannel(playlistsChannel)
      supabase.removeChannel(playlistMeditationsChannel)
    }
  }, [])

  async function fetchAllData() {
    const supabase = createClient()

    const [meditationsRes, playlistsRes, playlistMeditationsRes] = await Promise.all([
      supabase.from("meditations").select("*").order("created_at", { ascending: false }),
      supabase.from("playlists").select("*").order("created_at", { ascending: false }),
      supabase.from("playlist_meditations").select("*").order("added_at", { ascending: false }),
    ])

    setMeditations(meditationsRes.data || [])
    setPlaylists(playlistsRes.data || [])
    setPlaylistMeditations(playlistMeditationsRes.data || [])
    setLoading(false)
    setRefreshing(false)
  }

  async function handleRefresh() {
    setRefreshing(true)
    await fetchAllData()
  }

  function formatValue(value: any): string {
    if (value === null || value === undefined) return "null"
    if (typeof value === "object") return JSON.stringify(value, null, 2)
    if (typeof value === "boolean") return value.toString()
    return String(value)
  }

  function truncateText(text: string, maxLength = 50): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + "..."
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
          <h1 className="text-3xl font-bold text-white">Database Explorer</h1>
          <p className="mt-2 text-neutral-400">View and monitor all database tables in real-time</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Database Tables */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Database className="h-5 w-5" />
            Database Tables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="meditations" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-neutral-950">
              <TabsTrigger value="meditations" className="data-[state=active]:bg-emerald-600">
                Meditations ({meditations.length})
              </TabsTrigger>
              <TabsTrigger value="playlists" className="data-[state=active]:bg-blue-600">
                Playlists ({playlists.length})
              </TabsTrigger>
              <TabsTrigger value="playlist_meditations" className="data-[state=active]:bg-purple-600">
                Playlist Meditations ({playlistMeditations.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="meditations" className="mt-6">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-neutral-800">
                      <TableHead className="text-neutral-400">ID</TableHead>
                      <TableHead className="text-neutral-400">Title</TableHead>
                      <TableHead className="text-neutral-400">Duration</TableHead>
                      <TableHead className="text-neutral-400">Source</TableHead>
                      <TableHead className="text-neutral-400">Audio URL</TableHead>
                      <TableHead className="text-neutral-400">Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meditations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-neutral-500">
                          No data
                        </TableCell>
                      </TableRow>
                    ) : (
                      meditations.map((row) => (
                        <TableRow key={row.id} className="border-neutral-800 hover:bg-neutral-800/50">
                          <TableCell className="font-mono text-xs text-neutral-400">
                            {truncateText(row.id, 8)}
                          </TableCell>
                          <TableCell className="text-white">{row.title || "—"}</TableCell>
                          <TableCell className="text-neutral-300">{row.duration}s</TableCell>
                          <TableCell>
                            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
                              {row.source || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-neutral-400">
                            {row.audio_url ? truncateText(row.audio_url, 30) : "—"}
                          </TableCell>
                          <TableCell className="text-neutral-400">
                            {new Date(row.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="playlists" className="mt-6">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-neutral-800">
                      <TableHead className="text-neutral-400">ID</TableHead>
                      <TableHead className="text-neutral-400">Name</TableHead>
                      <TableHead className="text-neutral-400">Description</TableHead>
                      <TableHead className="text-neutral-400">Created At</TableHead>
                      <TableHead className="text-neutral-400">Updated At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playlists.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-neutral-500">
                          No data
                        </TableCell>
                      </TableRow>
                    ) : (
                      playlists.map((row) => (
                        <TableRow key={row.id} className="border-neutral-800 hover:bg-neutral-800/50">
                          <TableCell className="font-mono text-xs text-neutral-400">
                            {truncateText(row.id, 8)}
                          </TableCell>
                          <TableCell className="text-white">{row.name || "—"}</TableCell>
                          <TableCell className="text-neutral-300">{truncateText(row.description || "—", 40)}</TableCell>
                          <TableCell className="text-neutral-400">
                            {new Date(row.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-neutral-400">
                            {new Date(row.updated_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="playlist_meditations" className="mt-6">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-neutral-800">
                      <TableHead className="text-neutral-400">ID</TableHead>
                      <TableHead className="text-neutral-400">Playlist ID</TableHead>
                      <TableHead className="text-neutral-400">Meditation ID</TableHead>
                      <TableHead className="text-neutral-400">Added At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playlistMeditations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-neutral-500">
                          No data
                        </TableCell>
                      </TableRow>
                    ) : (
                      playlistMeditations.map((row) => (
                        <TableRow key={row.id} className="border-neutral-800 hover:bg-neutral-800/50">
                          <TableCell className="font-mono text-xs text-neutral-400">
                            {truncateText(row.id, 8)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-blue-400">
                            {truncateText(row.playlist_id, 8)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-emerald-400">
                            {truncateText(row.meditation_id, 8)}
                          </TableCell>
                          <TableCell className="text-neutral-400">{new Date(row.added_at).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

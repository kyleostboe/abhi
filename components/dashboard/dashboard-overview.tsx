"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Music, ListMusic, Clock, TrendingUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"

interface Stats {
  totalMeditations: number
  totalPlaylists: number
  totalDuration: number
  recentActivity: number
}

interface ChartData {
  name: string
  count: number
}

export function DashboardOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [meditationsByMonth, setMeditationsByMonth] = useState<ChartData[]>([])
  const [recentMeditations, setRecentMeditations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Fetch total meditations
      const { count: meditationsCount } = await supabase.from("meditations").select("*", { count: "exact", head: true })

      // Fetch total playlists
      const { count: playlistsCount } = await supabase.from("playlists").select("*", { count: "exact", head: true })

      // Fetch total duration
      const { data: meditations } = await supabase.from("meditations").select("duration")
      const totalDuration = meditations?.reduce((sum, m) => sum + (m.duration || 0), 0) || 0

      // Fetch recent meditations (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const { count: recentCount } = await supabase
        .from("meditations")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString())

      setStats({
        totalMeditations: meditationsCount || 0,
        totalPlaylists: playlistsCount || 0,
        totalDuration: Math.round(totalDuration / 60), // Convert to minutes
        recentActivity: recentCount || 0,
      })

      // Fetch meditations by month for chart
      const { data: allMeditations } = await supabase
        .from("meditations")
        .select("created_at")
        .order("created_at", { ascending: true })

      if (allMeditations) {
        const monthCounts: { [key: string]: number } = {}
        allMeditations.forEach((m) => {
          const date = new Date(m.created_at)
          const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
          monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1
        })

        const chartData = Object.entries(monthCounts)
          .slice(-6)
          .map(([name, count]) => ({ name, count }))
        setMeditationsByMonth(chartData)
      }

      // Fetch recent meditations
      const { data: recent } = await supabase
        .from("meditations")
        .select("id, title, duration, created_at")
        .order("created_at", { ascending: false })
        .limit(5)

      setRecentMeditations(recent || [])
      setLoading(false)
    }

    fetchData()

    const supabase = createClient()
    const meditationsChannel = supabase
      .channel("overview-meditations")
      .on("postgres_changes", { event: "*", schema: "public", table: "meditations" }, () => {
        fetchData()
      })
      .subscribe()

    const playlistsChannel = supabase
      .channel("overview-playlists")
      .on("postgres_changes", { event: "*", schema: "public", table: "playlists" }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(meditationsChannel)
      supabase.removeChannel(playlistsChannel)
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 bg-neutral-800" />
          <Skeleton className="mt-2 h-5 w-96 bg-neutral-800" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-neutral-800" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
        <p className="mt-2 text-neutral-400">Monitor your meditation library and analytics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">Total Meditations</CardTitle>
            <Music className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalMeditations}</div>
            <p className="text-xs text-neutral-500">Audio files in library</p>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">Total Playlists</CardTitle>
            <ListMusic className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalPlaylists}</div>
            <p className="text-xs text-neutral-500">Curated collections</p>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">Total Duration</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalDuration}</div>
            <p className="text-xs text-neutral-500">Minutes of content</p>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-400">Recent Activity</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.recentActivity}</div>
            <p className="text-xs text-neutral-500">Added in last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-white">Meditations Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={meditationsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                <XAxis dataKey="name" stroke="#a3a3a3" style={{ fontSize: "12px" }} />
                <YAxis stroke="#a3a3a3" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#171717",
                    border: "1px solid #404040",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-neutral-800 bg-neutral-900">
          <CardHeader>
            <CardTitle className="text-white">Monthly Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={meditationsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                <XAxis dataKey="name" stroke="#a3a3a3" style={{ fontSize: "12px" }} />
                <YAxis stroke="#a3a3a3" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#171717",
                    border: "1px solid #404040",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Meditations */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-white">Recent Meditations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentMeditations.length === 0 ? (
              <p className="text-center text-neutral-500">No meditations yet</p>
            ) : (
              recentMeditations.map((meditation) => (
                <div
                  key={meditation.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Music className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{meditation.title || "Untitled"}</p>
                      <p className="text-sm text-neutral-500">{new Date(meditation.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-neutral-400">
                      {Math.floor(meditation.duration / 60)}:{String(meditation.duration % 60).padStart(2, "0")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Navigation } from "@/components/navigation"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { formatTime } from "@/lib/utils"
import { Play, Download, Trash2, Clock, Calendar, BookOpen } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface Meditation {
  id: string
  title: string
  type: "adjuster" | "encoder"
  audio_url: string
  original_duration?: number
  processed_duration?: number
  target_duration?: number
  created_at: string
  settings?: any
}

export default function MeditationsPage() {
  const [meditations, setMeditations] = useState<Meditation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuthAndLoadMeditations = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/login")
        return
      }

      setUser(session.user)
      await loadMeditations(session.user.id)
    }

    checkAuthAndLoadMeditations()
  }, [router, supabase.auth])

  const loadMeditations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("meditations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error

      setMeditations(data || [])
    } catch (error) {
      console.error("Error loading meditations:", error)
      toast({
        title: "Error",
        description: "Could not load your meditations. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getAudioUrl = async (audioPath: string) => {
    const { data } = await supabase.storage.from("meditation-audio").createSignedUrl(audioPath, 3600) // 1 hour expiry

    return data?.signedUrl
  }

  const playMeditation = async (meditation: Meditation) => {
    try {
      const audioUrl = await getAudioUrl(meditation.audio_url)
      if (!audioUrl) throw new Error("Could not get audio URL")

      // Stop currently playing audio
      if (currentlyPlaying) {
        const currentAudio = document.getElementById(currentlyPlaying) as HTMLAudioElement
        if (currentAudio) {
          currentAudio.pause()
          currentAudio.currentTime = 0
        }
      }

      // Play new audio
      const audio = document.getElementById(meditation.id) as HTMLAudioElement
      if (audio) {
        audio.src = audioUrl
        await audio.play()
        setCurrentlyPlaying(meditation.id)

        audio.onended = () => setCurrentlyPlaying(null)
        audio.onpause = () => setCurrentlyPlaying(null)
      }
    } catch (error) {
      console.error("Error playing meditation:", error)
      toast({
        title: "Playback Error",
        description: "Could not play meditation. Please try again.",
        variant: "destructive",
      })
    }
  }

  const downloadMeditation = async (meditation: Meditation) => {
    try {
      const audioUrl = await getAudioUrl(meditation.audio_url)
      if (!audioUrl) throw new Error("Could not get audio URL")

      const response = await fetch(audioUrl)
      const blob = await response.blob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${meditation.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.wav`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Download Started",
        description: `Downloading "${meditation.title}"`,
      })
    } catch (error) {
      console.error("Error downloading meditation:", error)
      toast({
        title: "Download Error",
        description: "Could not download meditation. Please try again.",
        variant: "destructive",
      })
    }
  }

  const deleteMeditation = async (meditation: Meditation) => {
    if (!confirm(`Are you sure you want to delete "${meditation.title}"? This action cannot be undone.`)) {
      return
    }

    try {
      // Delete from storage
      await supabase.storage.from("meditation-audio").remove([meditation.audio_url])

      // Delete from database
      const { error } = await supabase.from("meditations").delete().eq("id", meditation.id)

      if (error) throw error

      setMeditations((prev) => prev.filter((m) => m.id !== meditation.id))

      toast({
        title: "Meditation Deleted",
        description: `"${meditation.title}" has been deleted.`,
      })
    } catch (error) {
      console.error("Error deleting meditation:", error)
      toast({
        title: "Delete Error",
        description: "Could not delete meditation. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-gray-900 dark:to-gray-800">
        <Navigation />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-logo-teal-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Loading your meditations...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-gray-900 dark:to-gray-800">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Your Meditation Library</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Access all your saved meditations from the Length Adjuster and Encoder tools.
          </p>
        </motion.div>

        {meditations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center py-16"
          >
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-logo-teal-100 dark:bg-logo-teal-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-12 h-12 text-logo-teal-500" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">No meditations yet</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                Start creating and saving meditations using our Length Adjuster or Encoder tools.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => router.push("/adjuster")} className="bg-logo-teal-500 hover:bg-logo-teal-600">
                  Length Adjuster
                </Button>
                <Button
                  onClick={() => router.push("/encoder")}
                  variant="outline"
                  className="border-logo-teal-500 text-logo-teal-700 hover:bg-logo-teal-50"
                >
                  Encoder
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {meditations.map((meditation, index) => (
                <motion.div
                  key={meditation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold mb-2 line-clamp-2">{meditation.title}</CardTitle>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={meditation.type === "adjuster" ? "default" : "secondary"}>
                              {meditation.type === "adjuster" ? "Length Adjuster" : "Encoder"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {meditation.processed_duration
                            ? formatTime(meditation.processed_duration)
                            : meditation.original_duration
                              ? formatTime(meditation.original_duration)
                              : "Unknown"}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(meditation.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-4">
                        {/* Hidden audio element for playback */}
                        <audio id={meditation.id} className="hidden" controls={false} />

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => playMeditation(meditation)}
                            className="flex-1 bg-logo-teal-500 hover:bg-logo-teal-600"
                            disabled={currentlyPlaying === meditation.id}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            {currentlyPlaying === meditation.id ? "Playing..." : "Play"}
                          </Button>

                          <Button size="sm" variant="outline" onClick={() => downloadMeditation(meditation)}>
                            <Download className="w-4 h-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteMeditation(meditation)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Additional info for adjuster meditations */}
                        {meditation.type === "adjuster" && meditation.settings && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                            {meditation.target_duration && <div>Target: {meditation.target_duration} minutes</div>}
                            {meditation.settings.pausesAdjusted && (
                              <div>Pauses adjusted: {meditation.settings.pausesAdjusted}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

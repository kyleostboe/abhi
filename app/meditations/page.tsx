"use client"

import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpenIcon, Download, Trash2, Clock, Calendar } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { formatTime } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

interface Meditation {
  id: number // bigint from DB
  user_id: string
  title: string
  description: string | null
  audio_url: string
  duration_seconds: number | null
  is_public: boolean
  created_at: string
}

export default async function MeditationsPage() {
  const supabase = createServerSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login") // Redirect to login if not authenticated
  }

  let meditations: Meditation[] = []
  let error: any = null

  try {
    const { data, error: fetchError } = await supabase
      .from("meditations")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })

    if (fetchError) {
      error = fetchError
      console.error("Error fetching meditations:", fetchError)
    } else {
      meditations = data || []
    }
  } catch (e) {
    error = e
    console.error("Unexpected error fetching meditations:", e)
  }

  const getSignedUrl = async (audioPath: string) => {
    "use server"
    const { data, error } = await supabase.storage.from("meditation-audio").createSignedUrl(audioPath, 3600) // 1 hour expiry
    if (error) {
      console.error("Error creating signed URL:", error)
      return null
    }
    return data?.signedUrl
  }

  const signedUrls = await Promise.all(meditations.map((meditation) => getSignedUrl(meditation.audio_url)))

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
      <Navigation />

      <div className="relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-white/40 overflow-hidden dark:bg-gray-900/80 transition-colors duration-300 ease-in-out">
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20 dark:from-amber-600/20 dark:via-rose-500/15 dark:via-purple-600/10 dark:to-teal-500/20"></div>
          </div>
          <div className="relative text-center px-[69px] pt-16 pb-8">
            <h1
              className="text-5xl text-transparent bg-clip-text bg-gradient-to-r from-logo-amber via-logo-rose via-logo-purple to-logo-teal dark:from-logo-amber dark:via-logo-rose dark:via-logo-purple dark:to-logo-teal transform hover:scale-105 transition-transform duration-700 ease-out font-black md:text-6xl mb-0 tracking-tighter text-center"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                textShadow: "0 0 25px rgba(139, 69, 69, 0.25)",
              }}
            >
              My Meditations
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mt-4">Your personal library of saved meditations.</p>
          </div>
        </div>

        <div className="px-6 md:px-10 pb-10 font-serif font-black">
          {error && (
            <div className="p-4 rounded-md bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 mb-6">
              Error loading meditations: {error.message || "Unknown error"}
            </div>
          )}

          {meditations.length === 0 && !error ? (
            <Card className="p-8 space-y-6 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="text-center space-y-4">
                <BookOpenIcon className="h-12 w-12 mx-auto text-logo-teal-600 dark:text-logo-teal-400" />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">No Meditations Yet</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Start creating or adjusting meditations to save them to your library!
                </p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={() => redirect("/adjuster")} className="bg-logo-teal-500 hover:bg-logo-teal-600">
                    Length Adjuster
                  </Button>
                  <Button
                    onClick={() => redirect("/encoder")}
                    variant="outline"
                    className="border-logo-teal-500 text-logo-teal-700 hover:bg-logo-teal-50"
                  >
                    Encoder
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {meditations.map((meditation, index) => (
                <Card
                  key={meditation.id}
                  className="p-4 space-y-4 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700"
                >
                  <CardHeader className="p-0">
                    <CardTitle className="text-lg font-semibold">{meditation.title}</CardTitle>
                    {meditation.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{meditation.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="p-0 space-y-2">
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {meditation.duration_seconds && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(meditation.duration_seconds)}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(meditation.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <audio controls className="w-full" src={signedUrls[index] || ""}></audio>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={async () => {
                          const url = signedUrls[index]
                          if (url) {
                            const a = document.createElement("a")
                            a.href = url
                            a.download = `${meditation.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.wav`
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                            toast({ title: "Download Started", description: `Downloading "${meditation.title}"` })
                          } else {
                            toast({
                              title: "Download Error",
                              description: "Could not get audio URL for download.",
                              variant: "destructive",
                            })
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" /> Download
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete "${meditation.title}"?`)) {
                            const { error: deleteError } = await supabase
                              .from("meditations")
                              .delete()
                              .eq("id", meditation.id)
                            if (deleteError) {
                              toast({ title: "Delete Error", description: deleteError.message, variant: "destructive" })
                            } else {
                              // Also delete from storage
                              await supabase.storage.from("meditation-audio").remove([meditation.audio_url])
                              toast({
                                title: "Meditation Deleted",
                                description: `"${meditation.title}" has been deleted.`,
                              })
                              // Refresh the page to reflect changes
                              redirect("/meditations")
                            }
                          }
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
      </div>
    </div>
  )
}

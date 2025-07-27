import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { BookOpenIcon } from "lucide-react"
import { Navigation } from "@/components/navigation"

export default async function MeditationsPage() {
  const supabase = createServerSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login") // Redirect to login if not authenticated [^3]
  }

  // In a real application, you would fetch meditations for the logged-in user here
  const userMeditations: any[] = [] // Placeholder for user's meditations

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
          {userMeditations.length === 0 ? (
            <Card className="p-8 space-y-6 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="text-center space-y-4">
                <BookOpenIcon className="h-12 w-12 mx-auto text-logo-teal-600 dark:text-logo-teal-400" />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">No Meditations Yet</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Start creating or adjusting meditations to save them to your library!
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {/* Placeholder for listing meditations */}
              {userMeditations.map((meditation) => (
                <Card key={meditation.id} className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">{meditation.title}</h3>
                    <p className="text-sm text-gray-500">Duration: {meditation.duration} min</p>
                  </div>
                  <Button variant="outline">Play</Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

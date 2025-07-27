"use client"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Heart, Sun, PlayCircle } from "lucide-react"
import { Navigation } from "@/components/navigation"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-gray-900 dark:to-gray-800">
      <Navigation />

      <div className="absolute top-4 right-4"></div>

      <main className="container mx-auto px-4 py-8 text-center">
        <section className="hero-section mb-16">
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
            Find Your Inner Peace with <span className="text-logo-teal-500">abhī</span>
          </h1>
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Your daily companion for mindfulness, meditation, and personal growth. Start your journey to a calmer, more
            focused you.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/adjuster">
              <Button size="lg" className="bg-logo-teal-500 hover:bg-logo-teal-600 text-white shadow-lg">
                <PlayCircle className="mr-2 h-5 w-5" />
                Start Meditating
              </Button>
            </Link>
            <Link href="/meditations">
              <Button
                size="lg"
                variant="outline"
                className="border-logo-teal-500 text-logo-teal-700 hover:bg-logo-teal-50 dark:text-logo-teal-300 dark:border-logo-teal-300 dark:hover:bg-gray-700 bg-transparent"
              >
                <BookOpen className="mr-2 h-5 w-5" />
                Explore Library
              </Button>
            </Link>
          </div>
        </section>

        <section className="features-section mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-10">Why Choose abhī?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-6 flex flex-col items-center text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
              <Heart className="h-12 w-12 text-logo-teal-500 mb-4" />
              <CardTitle className="text-xl font-semibold mb-2">Personalized Journeys</CardTitle>
              <CardDescription>
                Tailored meditation paths to suit your goals, whether it's stress reduction, better sleep, or focus.
              </CardDescription>
            </Card>
            <Card className="p-6 flex flex-col items-center text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
              <BookOpen className="h-12 w-12 text-logo-teal-500 mb-4" />
              <CardTitle className="text-xl font-semibold mb-2">Extensive Library</CardTitle>
              <CardDescription>
                Access hundreds of guided meditations, soundscapes, and talks from experienced instructors.
              </CardDescription>
            </Card>
            <Card className="p-6 flex flex-col items-center text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
              <Sun className="h-12 w-12 text-logo-teal-500 mb-4" />
              <CardTitle className="text-xl font-semibold mb-2">Daily Mindfulness</CardTitle>
              <CardDescription>
                Short, impactful sessions to integrate mindfulness seamlessly into your busy day.
              </CardDescription>
            </Card>
          </div>
        </section>

        <section className="cta-section bg-logo-teal-500 text-white py-16 rounded-lg shadow-xl dark:bg-logo-teal-700">
          <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Life?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of users finding peace and clarity with abhī. It's free to start!
          </p>
          <Link href="/login">
            <Button size="lg" className="bg-white text-logo-teal-500 hover:bg-gray-100 shadow-lg">
              Sign Up for Free
            </Button>
          </Link>
        </section>
      </main>

      <footer className="py-8 text-center text-gray-600 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} abhī. All rights reserved.</p>
        <div className="flex justify-center space-x-4 mt-2">
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:underline">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  )
}

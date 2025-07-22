import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { DollarSign, Heart, Handshake } from "lucide-react/dist/lucide-react.mjs" // Corrected import path
import { Navigation } from "@/components/navigation"

export default function DonatePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
      <Navigation />
      <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-white/40 overflow-hidden dark:bg-gray-900/80 transition-colors duration-300 ease-in-out">
        <div className="relative text-center px-[69px] py-16">
          <h1
            className="text-5xl text-transparent bg-clip-text bg-gradient-to-r from-logo-amber via-logo-rose via-logo-purple to-logo-teal dark:from-logo-amber dark:via-logo-rose dark:via-logo-purple dark:to-logo-teal transform hover:scale-105 transition-transform duration-700 ease-out font-black md:text-6xl mb-0 tracking-tighter text-center"
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              textShadow: "0 0 25px rgba(139, 69, 69, 0.25)",
            }}
          >
            Support abhī
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mt-4 mb-8">
            Your generous contributions help us keep abhī running and continue developing new features.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-white/10 border-none">
              <CardHeader>
                <DollarSign className="h-12 w-12 text-logo-teal-500 mx-auto mb-4" />
                <CardTitle className="text-logo-teal-600 dark:text-logo-teal-400">One-Time Donation</CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400">
                  Make a single contribution of any amount.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">$25</p>
                <Button className="w-full bg-logo-teal-500 hover:bg-logo-teal-600 dark:bg-logo-teal-700 dark:hover:bg-logo-teal-800">
                  Donate Now
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-white/10 border-none">
              <CardHeader>
                <Heart className="h-12 w-12 text-logo-rose-500 mx-auto mb-4" />
                <CardTitle className="text-logo-rose-600 dark:text-logo-rose-400">Monthly Support</CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400">
                  Become a patron and support us regularly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">$5/month</p>
                <Button className="w-full bg-logo-rose-500 hover:bg-logo-rose-600 dark:bg-logo-rose-700 dark:hover:bg-logo-rose-800">
                  Become a Patron
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-white/10 border-none">
              <CardHeader>
                <Handshake className="h-12 w-12 text-logo-purple-500 mx-auto mb-4" />
                <CardTitle className="text-logo-purple-600 dark:text-logo-purple-400">Partnerships</CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400">
                  Explore collaboration opportunities with abhī.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Custom</p>
                <Button className="w-full bg-logo-purple-500 hover:bg-logo-purple-600 dark:bg-logo-purple-700 dark:hover:bg-logo-purple-800">
                  Contact Us
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12">
            <Link href="/" passHref>
              <Button
                variant="outline"
                className="border-gray-400 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 bg-transparent"
              >
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

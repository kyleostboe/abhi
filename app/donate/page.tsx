import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { HeartHandshake, DollarSign, CreditCard, Bitcoin } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DonatePage() {
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
              Support abhī
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mt-4">
              Your generous contributions help us keep abhī free and improve our tools.
            </p>
          </div>
        </div>

        <div className="px-6 md:px-10 pb-10 font-serif font-black">
          <Card className="p-8 space-y-6 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-center space-y-4">
              <HeartHandshake className="h-12 w-12 mx-auto text-logo-teal-600 dark:text-logo-teal-400" />
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Make a Donation</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Every little bit helps us maintain our servers, develop new features, and provide a better experience
                for everyone.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <DollarSign className="h-8 w-8 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Patreon</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Support us monthly on Patreon for exclusive content.
                </p>
                <Button variant="outline" className="mt-2 bg-transparent">
                  Become a Patron
                </Button>
              </div>
              <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <CreditCard className="h-8 w-8 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">One-time Donation</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Make a secure one-time donation via credit card.
                </p>
                <Button variant="outline" className="mt-2 bg-transparent">
                  Donate Now
                </Button>
              </div>
              <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <Bitcoin className="h-8 w-8 text-orange-500" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Crypto</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Support us with your favorite cryptocurrency.
                </p>
                <Button variant="outline" className="mt-2 bg-transparent">
                  Donate Crypto
                </Button>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              Thank you for being a part of the abhī community!
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Heart, Handshake } from 'lucide-react'

export default function DonatePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
      <Navigation />
      <div className="relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-white/40 overflow-hidden dark:bg-gray-900/80 transition-colors duration-300 ease-in-out">
        <div className="relative text-center px-[69px]">
          <h1
            className="text-5xl text-transparent bg-clip-text bg-gradient-to-r from-logo-amber via-logo-rose via-logo-purple to-logo-teal dark:from-logo-amber dark:via-logo-rose dark:via-logo-purple dark:to-logo-teal transform hover:scale-105 transition-transform duration-700 ease-out font-black md:text-6xl mb-0 tracking-tighter text-center mt-16"
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              textShadow: "0 0 25px rgba(139, 69, 69, 0.25)",
            }}
          >
            Support abhī
          </h1>
          <p className="font-black text-logo-rose-600 font-serif mb-[7px] text-xs">
            Your generosity helps us keep this tool free and accessible.
          </p>
          <div className="flex justify-center items-center mb-4 space-x-[3px]">
            <div className="bg-gradient-to-br from-logo-teal to-logo-emerald rounded-sm transform rotate-12 dark:from-logo-teal dark:to-logo-emerald w-[13px] h-[13px]"></div>
            <div className="bg-gradient-to-br from-logo-rose to-pink-300 rounded-full dark:from-logo-rose dark:to-pink-400 h-[9px] w-[9px]"></div>
            <div className="w-4 bg-gradient-to-br from-logo-amber to-orange-300 rounded-full transform -rotate-6 dark:from-logo-amber dark:to-orange-400 h-[9px]"></div>
            <div className="dark:bg-white px-0 mx-0 border-gray-600 rounded-none w-[51px] text-logo-rose-600 border-0 h-[5px] bg-gray-600"></div>
            <div className="w-4 bg-gradient-to-br from-logo-purple to-indigo-300 rounded-full transform rotate-6 dark:from-logo-purple dark:to-indigo-400 h-[9px] pl-0 ml-2"></div>
            <div className="bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full dark:from-blue-500 dark:to-cyan-400 h-[9px] w-[9px]"></div>
            <div className="bg-gradient-to-br from-logo-emerald to-logo-teal rounded-sm transform -rotate-12 dark:from-logo-emerald dark:to-logo-teal w-[13px] h-[13px]"></div>
          </div>
        </div>

        <div className="px-6 md:px-10 pb-10 font-serif font-black">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center shadow-lg dark:shadow-white/10">
              <CardHeader>
                <CardTitle className="flex flex-col items-center">
                  <DollarSign className="h-8 w-8 mb-2 text-logo-teal-500" />
                  One-time Donation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Make a single contribution to help us cover operational costs.
                </p>
                <Button className="bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 text-white dark:from-logo-teal-700 dark:to-logo-emerald-700 hover:from-logo-teal-600 hover:to-logo-emerald-600">
                  Donate Now
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center shadow-lg dark:shadow-white/10">
              <CardHeader>
                <CardTitle className="flex flex-col items-center">
                  <Heart className="h-8 w-8 mb-2 text-logo-rose-500" />
                  Monthly Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Become a recurring donor and provide stable support for our development.
                </p>
                <Button className="bg-gradient-to-r from-logo-rose-500 to-logo-amber-500 text-white dark:from-logo-rose-700 dark:to-logo-amber-700 hover:from-logo-rose-600 hover:to-logo-amber-600">
                  Become a Patron
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center shadow-lg dark:shadow-white/10">
              <CardHeader>
                <CardTitle className="flex flex-col items-center">
                  <Handshake className="h-8 w-8 mb-2 text-logo-purple-500" />
                  Partnerships
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Explore collaboration opportunities or corporate sponsorships.
                </p>
                <Button className="bg-gradient-to-r from-logo-purple-500 to-indigo-500 text-white dark:from-logo-purple-700 dark:to-indigo-700 hover:from-logo-purple-600 hover:to-indigo-600">
                  Learn More
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 text-center text-gray-700 dark:text-gray-300">
            <p className="mb-2">
              Every contribution, no matter how small, makes a significant difference. Thank you for being a part of
              the abhī community!
            </p>
            <p className="text-sm">
              For alternative donation methods or inquiries, please{" "}
              <a href="/contact" className="text-logo-teal-500 hover:underline">
                contact us
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

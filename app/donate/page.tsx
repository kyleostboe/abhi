import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, Heart, Handshake } from 'lucide-react'

export default function DonatePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
      <Navigation />
      <div className="relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-white/40 overflow-hidden dark:bg-gray-900/80 transition-colors duration-300 ease-in-out"
        style={{
          borderRadius: "3rem 2.5rem 3rem 2.5rem",
        }}>
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
          <div className="font-black text-logo-rose-600 font-serif mb-[7px] text-xs">Donate to Our Cause</div>
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
          <Card className="p-6 space-y-6 bg-white dark:bg-gray-900 shadow-lg dark:shadow-white/10 border-none">
            <div className="text-center space-y-4">
              <p className="text-lg text-gray-700 dark:text-gray-300">
                Your generous contributions help us maintain and improve abhī, providing free tools for meditation and mindfulness.
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Every donation, no matter how small, makes a significant difference.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center p-4 border rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <DollarSign className="h-10 w-10 text-logo-teal-500 mb-3" />
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Financial Support</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Help cover server costs, development, and new features.
                </p>
                <Button className="bg-logo-teal-500 hover:bg-logo-teal-600 text-white dark:bg-logo-teal-700 dark:hover:bg-logo-teal-800">
                  Donate Now
                </Button>
              </div>

              <div className="flex flex-col items-center text-center p-4 border rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <Heart className="h-10 w-10 text-logo-rose-500 mb-3" />
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Spread the Word</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Share abhī with friends, family, and your community.
                </p>
                <Button variant="outline" className="border-logo-rose-500 text-logo-rose-500 hover:bg-logo-rose-50 dark:border-logo-rose-700 dark:text-logo-rose-400 dark:hover:bg-logo-rose-900">
                  Share
                </Button>
              </div>

              <div className="flex flex-col items-center text-center p-4 border rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <Handshake className="h-10 w-10 text-logo-purple-500 mb-3" />
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Volunteer</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Contribute your skills to the project. Contact us for opportunities.
                </p>
                <Button variant="outline" className="border-logo-purple-500 text-logo-purple-500 hover:bg-logo-purple-50 dark:border-logo-purple-700 dark:text-logo-purple-400 dark:hover:bg-logo-purple-900">
                  Volunteer
                </Button>
              </div>
            </div>

            <div className="text-center pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Thank you for being a part of the abhī community!
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

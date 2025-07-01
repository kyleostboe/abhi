"use client"

import { motion } from "framer-motion"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Heart, Coffee, Star, Gift } from "lucide-react"

export default function DonatePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,hsl(var(--logo-emerald)/0.1),hsl(var(--logo-teal)/0.1)_30%,hsl(var(--logo-purple)/0.1)_70%)] dark:bg-[radial-gradient(circle_at_top_right,#0F172A,#111827_30%,#1E1B34_70%)] p-4 md:p-8 transition-colors duration-300 ease-in-out md:py-0 md:pb-8">
      <Navigation />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-white/40 overflow-hidden dark:bg-gray-900/80 transition-colors duration-300 ease-in-out"
        style={{
          borderRadius: "3rem 2.5rem 3rem 2.5rem",
        }}
      >
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20 dark:from-amber-600/20 dark:via-rose-500/15 dark:via-purple-600/10 dark:to-teal-500/20"></div>
            <div className="absolute top-2 left-8 w-16 h-12 bg-gradient-to-br from-emerald-300/30 to-teal-400/25 rounded-full transform rotate-12 dark:from-emerald-500/30 dark:to-teal-600/25"></div>
            <div className="absolute top-6 right-12 w-20 h-8 bg-gradient-to-bl from-rose-300/25 to-purple-400/20 rounded-full transform -rotate-6 dark:from-rose-500/25 dark:to-purple-600/20"></div>
            <div className="absolute top-1 left-1/3 w-12 h-16 bg-gradient-to-tr from-amber-300/20 to-orange-400/15 rounded-full transform rotate-45 dark:from-amber-500/20 dark:to-orange-600/15"></div>
            <div className="absolute top-8 right-1/4 w-14 h-10 bg-gradient-to-tl from-blue-300/25 to-indigo-400/20 rounded-full transform -rotate-12 dark:from-blue-500/25 dark:to-indigo-600/20"></div>
          </div>
          <div className="relative px-8 text-center pb-2 pt-16">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1 className="text-5xl text-black dark:text-white transform hover:scale-105 transition-transform duration-700 ease-out tracking-wide mb-[3px] font-black md:text-6xl">
                Support This Project
              </h1>
            </motion.div>
          </div>
        </div>

        <div className="px-6 md:px-10 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-2xl mx-auto"
          >
            <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-8 leading-relaxed">
              If this meditation tool has been helpful to you, consider supporting its development and maintenance. Your
              contribution helps keep the project free and accessible to everyone.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-6 hover:shadow-lg dark:hover:shadow-white/20 transition-shadow bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <div className="bg-pink-100 dark:bg-pink-900 p-3 rounded-full mr-4">
                    <Heart className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">One-time Donation</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Make a one-time contribution to support the project's development.
                </p>
                <Button
                  className="w-full bg-pink-600 hover:bg-pink-700 dark:bg-pink-700 dark:hover:bg-pink-800"
                  onClick={() => window.open("https://paypal.me/example", "_blank")}
                >
                  Donate via PayPal
                </Button>
              </Card>

              <Card className="p-6 hover:shadow-lg dark:hover:shadow-white/20 transition-shadow bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-full mr-4">
                    <Coffee className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Buy Me a Coffee</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Support with the price of a coffee to fuel late-night coding sessions.
                </p>
                <Button
                  className="w-full bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800"
                  onClick={() => window.open("https://buymeacoffee.com/example", "_blank")}
                >
                  Buy Me a Coffee
                </Button>
              </Card>

              <Card className="p-6 hover:shadow-lg dark:hover:shadow-white/20 transition-shadow bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full mr-4">
                    <Star className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">GitHub Sponsors</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Become a sponsor on GitHub for ongoing support and recognition.
                </p>
                <Button
                  variant="outline"
                  className="w-full border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900 bg-transparent"
                  onClick={() => window.open("https://github.com/sponsors/example", "_blank")}
                >
                  Sponsor on GitHub
                </Button>
              </Card>

              <Card className="p-6 hover:shadow-lg dark:hover:shadow-white/20 transition-shadow bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full mr-4">
                    <Gift className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Other Ways to Help</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Share the project, contribute code, or provide feedback.
                </p>
                <Button
                  variant="outline"
                  className="w-full border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900 bg-transparent"
                  onClick={() => window.open("/contact", "_self")}
                >
                  Get Involved
                </Button>
              </Card>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-xl border border-blue-200 dark:border-blue-800"
            >
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Why Support?</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Keeps the service free and ad-free for everyone</li>
                <li>• Supports ongoing development and new features</li>
                <li>• Helps maintain server costs and infrastructure</li>
                <li>• Enables faster bug fixes and improvements</li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-6 text-center"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Every contribution, no matter the size, is deeply appreciated. Thank you for your support! 🙏
              </p>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

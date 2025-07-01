"use client"

import { motion } from "framer-motion"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mail, MessageCircle, Github, Twitter } from "lucide-react"

export default function ContactPage() {
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
                Get in Touch
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
              Have questions, feedback, or want to collaborate? I'd love to hear from you. Feel free to reach out
              through any of the channels below.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-6 hover:shadow-lg dark:hover:shadow-white/20 transition-shadow bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full mr-4">
                    <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Email</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Send me a direct message for any inquiries or feedback.
                </p>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                  onClick={() => (window.location.href = "mailto:hello@example.com")}
                >
                  Send Email
                </Button>
              </Card>

              <Card className="p-6 hover:shadow-lg dark:hover:shadow-white/20 transition-shadow bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full mr-4">
                    <MessageCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Discord</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Join our community for real-time discussions and support.
                </p>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                  onClick={() => window.open("https://discord.gg/example", "_blank")}
                >
                  Join Discord
                </Button>
              </Card>

              <Card className="p-6 hover:shadow-lg dark:hover:shadow-white/20 transition-shadow bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full mr-4">
                    <Github className="h-6 w-6 text-gray-800 dark:text-gray-200" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">GitHub</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Check out the source code and contribute to the project.
                </p>
                <Button
                  variant="outline"
                  className="w-full border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 bg-transparent"
                  onClick={() => window.open("https://github.com/example", "_blank")}
                >
                  View on GitHub
                </Button>
              </Card>

              <Card className="p-6 hover:shadow-lg dark:hover:shadow-white/20 transition-shadow bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full mr-4">
                    <Twitter className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Twitter</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Follow for updates and quick conversations.</p>
                <Button
                  variant="outline"
                  className="w-full border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 bg-transparent"
                  onClick={() => window.open("https://twitter.com/example", "_blank")}
                >
                  Follow on Twitter
                </Button>
              </Card>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 text-center"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">
                I typically respond within 24-48 hours. Looking forward to connecting with you!
              </p>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

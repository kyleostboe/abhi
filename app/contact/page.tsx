"use client"

import { motion } from "framer-motion"
import { Mail, Twitter, Instagram, Github } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Navigation } from "@/components/navigation"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,hsl(var(--logo-emerald)/0.1),hsl(var(--logo-teal)/0.1)_30%,hsl(var(--logo-purple)/0.1)_70%)] dark:bg-[radial-gradient(circle_at_top_right,#0F172A,#111827_30%,#1E1B34_70%)] transition-colors duration-300 ease-in-out">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl font-light text-center text-transparent bg-clip-text bg-gradient-to-r from-logo-teal-600 via-logo-teal-500 to-logo-emerald-400 mb-2 dark:from-logo-teal-400 dark:via-logo-teal-300 dark:to-logo-emerald-200">
            Get in Touch
          </h1>
          <p className="text-center text-gray-600 mb-12 dark:text-gray-300">
            Have questions or feedback? I'd love to hear from you!
          </p>

          <div className="flex justify-center">
            <Card className="overflow-hidden border-none shadow-lg bg-white/80 backdrop-blur-md dark:bg-gray-900/80 transition-colors duration-300 ease-in-out mb-6">
              <div className="p-6 border-solid">
                <h2 className="text-xl font-medium text-gray-800 mb-4 dark:text-gray-200">Connect With Me</h2>

                <div className="space-y-4">
                  <a
                    href="mailto:kyle@ostboe.com"
                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors dark:hover:bg-gray-800"
                  >
                    <div className="bg-logo-teal-100 p-2 rounded-full mr-3 dark:bg-logo-teal-800">
                      <Mail className="h-5 w-5 text-logo-teal-600 dark:text-logo-teal-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">kyle@ostboe.com</p>
                    </div>
                  </a>

                  <a
                    href="https://x.com/kyleostboe"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors dark:hover:bg-gray-800"
                  >
                    <div className="bg-logo-blue-100 p-2 rounded-full mr-3 dark:bg-logo-blue-800">
                      <Twitter className="h-5 w-5 text-logo-blue-600 dark:text-logo-blue-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">X (Twitter)</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">@kyleostboe</p>
                    </div>
                  </a>

                  <a
                    href="https://www.instagram.com/kyleostboe/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors dark:hover:bg-gray-800"
                  >
                    <div className="bg-logo-rose-100 p-2 rounded-full mr-3 dark:bg-logo-rose-800">
                      <Instagram className="h-5 w-5 text-logo-rose-600 dark:text-logo-rose-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Instagram</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">@kyleostboe</p>
                    </div>
                  </a>

                  <a
                    href="https://github.com/kyleostboe"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors dark:hover:bg-gray-800"
                  >
                    <div className="bg-gray-200 p-2 rounded-full mr-3 dark:bg-gray-700">
                      <Github className="h-5 w-5 text-gray-800 dark:text-gray-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">GitHub</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">kyleostboe</p>
                    </div>
                  </a>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Mail, Twitter, Instagram, Send, CheckCircle, Github } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Navigation } from "@/components/navigation"

export default function ContactPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsSubmitting(false)
    setIsSubmitted(true)
    setName("")
    setEmail("")
    setMessage("")

    // Reset success message after 5 seconds
    setTimeout(() => {
      setIsSubmitted(false)
    }, 5000)
  }

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Contact Form */}
            <div className="md:col-span-2">
              <Card className="overflow-hidden border-none shadow-lg bg-white/80 backdrop-blur-md dark:bg-gray-900/80 transition-colors duration-300 ease-in-out">
                <div className="p-6">
                  <h2 className="text-xl font-medium text-gray-800 mb-4 dark:text-gray-200">Send a Message</h2>

                  {isSubmitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-logo-emerald-50 border border-logo-emerald-200 rounded-lg p-4 text-center dark:bg-logo-emerald-950 dark:border-logo-emerald-700"
                    >
                      <CheckCircle className="h-12 w-12 text-logo-emerald-500 mx-auto mb-2 dark:text-logo-emerald-300" />
                      <h3 className="text-lg font-medium text-logo-emerald-700 dark:text-logo-emerald-200">
                        Message Sent!
                      </h3>
                      <p className="text-logo-emerald-600 dark:text-logo-emerald-400">
                        Thank you for reaching out. I'll get back to you soon.
                      </p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit}>
                      <div className="space-y-4">
                        <div>
                          <label
                            htmlFor="name"
                            className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
                          >
                            Your Name
                          </label>
                          <Input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="border-gray-200 focus:border-logo-teal-500 focus:ring-logo-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-logo-teal-400 dark:focus:ring-logo-teal-400"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
                          >
                            Email Address
                          </label>
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="border-gray-200 focus:border-logo-teal-500 focus:ring-logo-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-logo-teal-400 dark:focus:ring-logo-teal-400"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="message"
                            className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300"
                          >
                            Message
                          </label>
                          <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                            rows={5}
                            className="border-gray-200 focus:border-logo-teal-500 focus:ring-logo-teal-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-logo-teal-400 dark:focus:ring-logo-teal-400"
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 hover:from-logo-teal-600 hover:to-logo-emerald-600 text-white font-medium py-2 px-4 rounded-md transition-colors dark:from-logo-teal-700 dark:to-logo-emerald-700 dark:hover:from-logo-teal-800 dark:hover:to-logo-emerald-800"
                        >
                          {isSubmitting ? (
                            <span className="flex items-center">
                              <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Sending...
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <Send className="mr-2 h-4 w-4" />
                              Send Message
                            </span>
                          )}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </Card>
            </div>

            {/* Contact Info */}
            <div>
              <Card className="overflow-hidden border-none shadow-lg bg-white/80 backdrop-blur-md dark:bg-gray-900/80 transition-colors duration-300 ease-in-out mb-6">
                <div className="p-6">
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
          </div>
        </motion.div>
      </div>
    </div>
  )
}

import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Mail, Phone, MapPin } from "lucide-react"

export default function ContactPage() {
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
              Contact Us
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mt-4">
              We'd love to hear from you! Reach out with any questions or feedback.
            </p>
          </div>
        </div>

        <div className="px-6 md:px-10 pb-10 font-serif font-black">
          <Card className="p-8 space-y-6 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Get in Touch</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Whether you have a question about features, pricing, or anything else, our team is ready to answer all
                  your questions.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Mail className="h-5 w-5 text-logo-teal-600 dark:text-logo-teal-400" />
                    <span>support@abhi.com</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Phone className="h-5 w-5 text-logo-teal-600 dark:text-logo-teal-400" />
                    <span>+1 (555) 123-4567</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <MapPin className="h-5 w-5 text-logo-teal-600 dark:text-logo-teal-400" />
                    <span>123 Meditation Lane, Serenity City, CA 90210</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Send us a Message</h2>
                <form className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-logo-teal-500 focus:ring-logo-teal-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                      placeholder="Your Name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-logo-teal-500 focus:ring-logo-teal-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Message
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-logo-teal-500 focus:ring-logo-teal-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                      placeholder="Your message..."
                    ></textarea>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-logo-teal-600 hover:bg-logo-teal-700 text-white dark:bg-logo-teal-500 dark:hover:bg-logo-teal-600"
                  >
                    Send Message
                  </Button>
                </form>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

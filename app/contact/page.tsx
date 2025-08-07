import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Mail, Phone, MapPin } from 'lucide-react'

export default function ContactPage() {
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
            Contact Us
          </h1>
          <div className="font-black text-logo-rose-600 font-serif mb-[7px] text-xs">Get in Touch</div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Get in Touch</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  We'd love to hear from you! Whether you have a question, feedback, or just want to say hello, feel free to reach out.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Mail className="mr-2 h-5 w-5 text-logo-teal-500" />
                    <span>support@abhi.com</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Phone className="mr-2 h-5 w-5 text-logo-teal-500" />
                    <span>+1 (123) 456-7890</span>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <MapPin className="mr-2 h-5 w-5 text-logo-teal-500" />
                    <span>123 Meditation Lane, Serenity City, CA 90210</span>
                  </div>
                </div>
              </div>
              <form className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                  <Input id="name" type="text" placeholder="Your Name" className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <Input id="email" type="email" placeholder="your@example.com" className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                  <Textarea id="message" placeholder="Your message..." rows={5} className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
                </div>
                <Button type="submit" className="w-full bg-logo-teal-500 hover:bg-logo-teal-600 text-white dark:bg-logo-teal-700 dark:hover:bg-logo-teal-800">
                  Send Message
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

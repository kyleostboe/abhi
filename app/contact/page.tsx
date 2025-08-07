import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Mail, Phone, MapPin } from 'lucide-react'

export default function ContactPage() {
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
            Contact Us
          </h1>
          <p className="font-black text-logo-rose-600 font-serif mb-[7px] text-xs">
            We'd love to hear from you!
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center space-x-3 text-gray-700 dark:text-gray-300">
                <Mail className="h-5 w-5 text-logo-teal-500" />
                <span>info@abhī.com</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-700 dark:text-gray-300">
                <Phone className="h-5 w-5 text-logo-teal-500" />
                <span>+1 (123) 456-7890</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-700 dark:text-gray-300">
                <MapPin className="h-5 w-5 text-logo-teal-500" />
                <span>123 Meditation Lane, Serenity City, CA 90210</span>
              </div>
            </div>
            <form className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">
                  Name
                </Label>
                <Input id="name" placeholder="Your Name" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                  Email
                </Label>
                <Input id="email" type="email" placeholder="your@example.com" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="message" className="text-gray-700 dark:text-gray-300">
                  Message
                </Label>
                <Textarea id="message" placeholder="Your message..." rows={5} className="mt-1" />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-logo-teal-500 to-logo-purple-500 text-white dark:from-logo-teal-700 dark:to-logo-purple-700 hover:from-logo-teal-600 hover:to-logo-purple-600"
              >
                Send Message
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Mail, Phone, MapPin } from "lucide-react/dist/lucide-react.mjs" // Corrected import path
import { Navigation } from "@/components/navigation"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
      <Navigation />
      <div className="max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-white/40 overflow-hidden dark:bg-gray-900/80 transition-colors duration-300 ease-in-out">
        <div className="relative text-center px-[69px] py-16">
          <h1
            className="text-5xl text-transparent bg-clip-text bg-gradient-to-r from-logo-amber via-logo-rose via-logo-purple to-logo-teal dark:from-logo-amber dark:via-logo-rose dark:via-logo-purple dark:to-logo-teal transform hover:scale-105 transition-transform duration-700 ease-out font-black md:text-6xl mb-0 tracking-tighter text-center"
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              textShadow: "0 0 25px rgba(139, 69, 69, 0.25)",
            }}
          >
            Contact Us
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mt-4 mb-8">
            We'd love to hear from you! Reach out with any questions, feedback, or support inquiries.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-white/10 border-none">
              <CardHeader>
                <CardTitle className="text-logo-rose-600 dark:text-logo-rose-400">Get in Touch</CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400">
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Your Name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="Subject of your message" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Your message..." className="min-h-[100px]" />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-logo-rose-500 hover:bg-logo-rose-600 dark:bg-logo-rose-700 dark:hover:bg-logo-rose-800">
                  Send Message
                </Button>
              </CardFooter>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-white/10 border-none">
              <CardHeader>
                <CardTitle className="text-logo-teal-600 dark:text-logo-teal-400">Contact Information</CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400">
                  You can also reach us through the following channels:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-logo-teal-500" />
                  <span className="text-gray-700 dark:text-gray-300">support@abhī.com</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-logo-teal-500" />
                  <span className="text-gray-700 dark:text-gray-300">+1 (123) 456-7890</span>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-logo-teal-500 flex-shrink-0 mt-1" />
                  <span className="text-gray-700 dark:text-gray-300">123 Meditation Lane, Serenity City, ST 98765</span>
                </div>
              </CardContent>
              <CardFooter>
                <Link href="/" passHref>
                  <Button
                    variant="outline"
                    className="w-full border-logo-teal-500 text-logo-teal-500 hover:bg-logo-teal-50 dark:border-logo-teal-700 dark:text-logo-teal-400 dark:hover:bg-logo-teal-900 bg-transparent"
                  >
                    Back to Home
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

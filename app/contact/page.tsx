import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Mail, Phone, MapPin } from "lucide-react"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8 md:pt-0">
      <Navigation />
      <div className="relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden transition-colors duration-300 ease-in-out">
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20 "></div>
          </div>
          <div className="relative text-center px-[69px] pt-16 pb-8">
            <h1
              className="text-5xl text-transparent bg-clip-text bg-gradient-to-r from-logo-amber via-logo-rose via-logo-purple to-logo-teal transform hover:scale-105 transition-transform duration-700 ease-out font-black md:text-6xl mb-0 tracking-tighter text-center"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                textShadow: "0 0 25px rgba(139, 69, 69, 0.25)",
              }}
            >
              Contact Us
            </h1>
            <p className="text-lg text-gray-600 mt-4">We'd love to hear from you!</p>
          </div>
        </div>

        <div className="px-6 md:px-10 pb-10 font-serif font-black">
          <Card className="p-8 space-y-6 bg-white shadow-lg border border-gray-200 ">
            <div className="flex items-center space-x-4">
              <Mail className="h-6 w-6 text-logo-teal-600 " />
              <div>
                <h3 className="text-lg font-semibold text-gray-800 ">Email</h3>
                <p className="text-gray-600 ">
                  <a href="mailto:support@example.com" className="text-blue-600 hover:underline ">
                    support@example.com
                  </a>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Phone className="h-6 w-6 text-logo-rose-600 " />
              <div>
                <h3 className="text-lg font-semibold text-gray-800 ">Phone</h3>
                <p className="text-gray-600 ">+1 (555) 123-4567</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <MapPin className="h-6 w-6 text-logo-purple-600 " />
              <div>
                <h3 className="text-lg font-semibold text-gray-800 ">Address</h3>
                <p className="text-gray-600 ">123 Meditation Lane, Serenity City, CA 90210</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

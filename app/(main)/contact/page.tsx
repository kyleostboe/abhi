import { Card } from "@/components/ui/card"
import { Mail, Phone, MapPin } from "lucide-react"

export default function ContactPage() {
  return (
    <>
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
    </>
  )
}

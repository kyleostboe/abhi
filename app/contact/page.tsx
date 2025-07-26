import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Mail, Phone, MapPin } from "lucide-react"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
      <Navigation />
      <div className="max-w-4xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-6 space-y-6 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center dark:text-gray-200">Get in Touch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              <p className="text-gray-700 dark:text-gray-300">info@abhī.com</p>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              <p className="text-gray-700 dark:text-gray-300">+1 (123) 456-7890</p>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              <p className="text-gray-700 dark:text-gray-300">123 Meditation Lane, Serenity City, CA 90210</p>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6 space-y-6 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center dark:text-gray-200">Send Us a Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Your Name" type="text" />
            <Input placeholder="Your Email" type="email" />
            <Input placeholder="Subject" type="text" />
            <Textarea placeholder="Your Message" rows={5} />
            <Button className="w-full">Send Message</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

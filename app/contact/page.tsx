import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function ContactPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-md space-y-6 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-50 mb-2">Contact Us</h1>
          <p className="text-gray-600 dark:text-gray-400">Have a question or feedback? We'd love to hear from you.</p>
        </div>
        <form className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">
              Name
            </Label>
            <Input id="name" placeholder="Your Name" type="text" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
              Email
            </Label>
            <Input id="email" placeholder="your@example.com" type="email" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="subject" className="text-gray-700 dark:text-gray-300">
              Subject
            </Label>
            <Input id="subject" placeholder="Subject of your message" type="text" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="message" className="text-gray-700 dark:text-gray-300">
              Message
            </Label>
            <Textarea id="message" placeholder="Your message..." rows={5} className="mt-1" />
          </div>
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
          >
            Send Message
          </Button>
        </form>
      </div>
    </div>
  )
}

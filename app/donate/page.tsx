import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, Heart, Handshake } from "lucide-react"

export default function DonatePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
      <Navigation />
      <div className="max-w-4xl mx-auto mt-10 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-6">Support Abhi</h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-10">
          Your generous contributions help us continue to provide and improve this meditation tool for everyone. Every
          donation, no matter how small, makes a significant difference.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-6 space-y-4 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <DollarSign className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-xl font-bold dark:text-gray-200">One-Time Donation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Make a single contribution to support our ongoing development and maintenance.
              </p>
              <Button className="w-full">Donate Now</Button>
            </CardContent>
          </Card>

          <Card className="p-6 space-y-4 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <Heart className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-xl font-bold dark:text-gray-200">Monthly Supporter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Become a recurring donor and provide stable support for our community.
              </p>
              <Button className="w-full bg-transparent" variant="outline">
                Become a Monthly Supporter
              </Button>
            </CardContent>
          </Card>

          <Card className="p-6 space-y-4 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <Handshake className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <CardTitle className="text-xl font-bold dark:text-gray-200">Partnerships</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Explore opportunities for collaboration and larger scale support.
              </p>
              <Button className="w-full">Contact Us for Partnerships</Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-10">
          Abhi is a non-profit initiative. All donations are tax-deductible.
        </p>
      </div>
    </div>
  )
}

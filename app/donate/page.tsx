import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircleIcon } from "lucide-react"
import Link from "next/link"

export default function DonatePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-4xl space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-gray-50 leading-tight">Support Our Mission</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Your generous contributions help us continue to provide free meditation tools and resources to everyone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg transition-transform transform hover:scale-105">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-gray-50">One-time</CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">Make a single contribution</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="text-5xl font-extrabold text-blue-600 dark:text-blue-400">$25</div>
              <ul className="text-left text-gray-700 dark:text-gray-300 space-y-2">
                <li className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                  Support development
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                  Maintain infrastructure
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                  Expand content library
                </li>
              </ul>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md transition-colors">
                Donate Now
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg transition-transform transform hover:scale-105 border-2 border-blue-500">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-gray-50">Monthly</CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                Become a recurring supporter
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="text-5xl font-extrabold text-blue-600 dark:text-blue-400">$10/month</div>
              <ul className="text-left text-gray-700 dark:text-gray-300 space-y-2">
                <li className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                  Sustainable growth
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                  Priority feature requests
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                  Exclusive content access
                </li>
              </ul>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md transition-colors">
                Subscribe
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg transition-transform transform hover:scale-105">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-gray-50">Custom</CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">Choose your own amount</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="text-5xl font-extrabold text-blue-600 dark:text-blue-400">Any Amount</div>
              <ul className="text-left text-gray-700 dark:text-gray-300 space-y-2">
                <li className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                  Flexible giving
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                  Direct impact
                </li>
                <li className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                  Tax-deductible (where applicable)
                </li>
              </ul>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md transition-colors">
                Enter Amount
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-gray-600 dark:text-gray-400 mt-8">
          <p>
            Your support helps us reach more people and continue our mission of promoting mindfulness and well-being.
          </p>
          <p className="mt-2">Thank you for being a part of the abhī community.</p>
          <Link
            href="/"
            className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Back to Home
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 ml-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}

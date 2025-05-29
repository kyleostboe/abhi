"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Copy, CheckCircle, Coffee, Bitcoin, Coins } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/navigation"

export default function DonatePage() {
  const [copiedBtc, setCopiedBtc] = useState(false)
  const [copiedEth, setCopiedEth] = useState(false)

  const btcAddress = "bc1qhd8n7krmnr5d90dxyj9m2t07ajpl5wsgx8fjzk" // Example address
  const ethAddress = "0xb95803DE77658B7a3202267781Ec931aE3C7eb38" // Example address

  const copyToClipboard = (text: string, type: "btc" | "eth") => {
    navigator.clipboard.writeText(text)
    if (type === "btc") {
      setCopiedBtc(true)
      setTimeout(() => setCopiedBtc(false), 3000)
    } else {
      setCopiedEth(true)
      setTimeout(() => setCopiedEth(false), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#e9f5f3,#f0f8ff_30%,#f8f0ff_70%)]">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl font-light text-center text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-400 mb-2">
            Support This Project
          </h1>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            If you find abhī helpful for your meditation practice, please consider supporting the project. Your
            contributions help keep the service running and enable new features.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Ko-fi */}
            <Card className="overflow-hidden border-none shadow-lg bg-white/80 backdrop-blur-md">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 py-4 px-6">
                <h2 className="text-xl font-medium text-white flex items-center">
                  <Coffee className="h-5 w-5 mr-2" />
                  Support on Ko-fi
                </h2>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-6">
                  Ko-fi is a friendly way to support creators with the metaphorical equivalent of a coffee. One-time or
                  monthly support options are available.
                </p>
                <div className="flex justify-center">
                  <a
                    href="https://ko-fi.com/kyleostboe"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 transition-colors"
                  >
                    <Coffee className="h-5 w-5 mr-2" />
                    Buy me a coffee
                  </a>
                </div>
              </div>
            </Card>

            {/* Crypto */}
            <Card className="overflow-hidden border-none shadow-lg bg-white/80 backdrop-blur-md">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-500 py-4 px-6">
                <h2 className="text-xl font-medium text-white flex items-center">
                  <Coins className="h-5 w-5 mr-2" />
                  Crypto
                </h2>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-6">
                  If you prefer to donate with cryptocurrency, you can send Bitcoin or Ethereum to the following
                  addresses:
                </p>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Bitcoin className="h-5 w-5 text-orange-500 mr-2" />
                      <span className="font-medium text-gray-700">Bitcoin</span>
                    </div>
                    <div className="flex items-center">
                      <code className="bg-gray-100 px-3 py-1 rounded text-sm text-gray-800 flex-1 overflow-x-auto">
                        {btcAddress}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(btcAddress, "btc")}
                        className="ml-2 text-gray-500 hover:text-gray-700"
                      >
                        {copiedBtc ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <svg
                        className="h-5 w-5 text-blue-500 mr-2"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M12 2L4.5 12.5L12 16.5L19.5 12.5L12 2Z" fill="currentColor" />
                        <path d="M4.5 14L12 18L19.5 14L12 22L4.5 14Z" fill="currentColor" />
                      </svg>
                      <span className="font-medium text-gray-700">Ethereum</span>
                    </div>
                    <div className="flex items-center">
                      <code className="bg-gray-100 px-3 py-1 rounded text-sm text-gray-800 flex-1 overflow-x-auto">
                        {ethAddress}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(ethAddress, "eth")}
                        className="ml-2 text-gray-500 hover:text-gray-700"
                      >
                        {copiedEth ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Thank you message */}
          <div className="text-center max-w-2xl mx-auto">
            <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-r from-teal-50 to-emerald-50">
              <div className="p-8">
                <h3 className="text-2xl font-light text-teal-700 mb-4">Thank You</h3>
                <p className="text-gray-600">Every contribution is deeply appreciated {"<3"}</p>
              </div>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

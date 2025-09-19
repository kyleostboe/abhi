import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Heart, DollarSign, Gift } from "lucide-react"

export default function DonatePage() {
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
              Support abhī
            </h1>
            <p className="text-lg text-gray-600 mt-4">
              Your generosity helps us keep this tool free and accessible.
            </p>
          </div>
        </div>

        <div className="px-6 md:px-10 pb-10 font-serif font-black">
          <Card className="p-8 space-y-6 bg-white shadow-lg border border-gray-200 ">
            <div className="text-center space-y-4">
              <Heart className="h-12 w-12 mx-auto text-logo-rose-600 " />
              <h2 className="text-2xl font-bold text-gray-800 ">Make a Donation</h2>
              <p className="text-gray-600 ">
                Every contribution, no matter how small, makes a difference.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Button className="h-auto py-4 text-lg bg-logo-teal-500 hover:bg-logo-teal-600 ">
                <DollarSign className="h-5 w-5 mr-2" />
                Donate $5
              </Button>
              <Button className="h-auto py-4 text-lg bg-logo-purple-500 hover:bg-logo-purple-600 ">
                <DollarSign className="h-5 w-5 mr-2" />
                Donate $10
              </Button>
              <Button className="h-auto py-4 text-lg bg-logo-amber-500 hover:bg-logo-amber-600 ">
                <Gift className="h-5 w-5 mr-2" />
                Custom Amount
              </Button>
            </div>

            <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-200 ">
              <p>Thank you for supporting our mission to make meditation accessible to everyone.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

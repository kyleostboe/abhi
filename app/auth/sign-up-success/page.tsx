import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function SignUpSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { returnTo: rawReturnTo } = await searchParams
  const returnTo = rawReturnTo && rawReturnTo.startsWith("/") ? rawReturnTo : "/library"

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card className="border-[3px] border-muted shadow-xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex items-center space-x-[5px]">
                  <div className="bg-gradient-to-br from-logo-teal to-logo-emerald rounded-sm transform rotate-12 w-[16px] h-[16px] shadow-md" />
                  <div className="bg-gradient-to-br from-logo-rose to-pink-300 rounded-full h-[11px] w-[11px] shadow" />
                  <div className="w-5 bg-gradient-to-br from-logo-amber to-orange-300 rounded-[4px] h-[11px] shadow-sm" />
                  <div className="bg-gradient-to-br from-gray-600 to-gray-500 border-[3px] bg-muted h-11 w-3 border-stone-200 shadow-md rounded-md" />
                  <div className="w-5 bg-gradient-to-br from-logo-purple to-indigo-300 rounded-[4px] h-[11px] shadow-sm" />
                  <div className="bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full h-[11px] w-[11px] shadow" />
                  <div className="bg-gradient-to-br from-logo-emerald to-logo-teal rounded-sm transform -rotate-12 w-[16px] h-[16px] shadow-md" />
                </div>
              </div>
              <CardTitle className="text-2xl font-black font-serif text-gray-700">Check your email!</CardTitle>
              <CardDescription className="font-serif">Confirm your account to continue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 font-serif">
                We've sent you a confirmation email. Please check your inbox and click the link to verify your account
                before signing in.
              </p>
              <Button asChild className="w-full bg-gradient-to-r from-logo-teal-500 to-logo-blue-400 text-white font-black shadow-md">
                <Link href={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`}>Go to Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

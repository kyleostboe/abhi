import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogoMark } from "@/components/logo-mark"
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
              <LogoMark className="mb-4" />
<CardTitle className="text-2xl font-black font-serif text-gray-700">Check your email!</CardTitle>
              <CardDescription className="font-serif">Confirm your account to continue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 font-serif">
                We&apos;ve sent you a confirmation email. Please check your inbox and click the link to verify your account
                before signing in.
              </p>
              <Button asChild variant="accent"
                className="w-full">
                <Link href={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`}>Go to Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

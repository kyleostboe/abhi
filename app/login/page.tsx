import { redirect } from "next/navigation"
import { getServerSupabase } from "@/lib/supabase/server"
import AuthForm from "@/components/auth-form"

export default async function LoginPage() {
  const supabase = getServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/") // Redirect to home if already logged in
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <AuthForm />
    </div>
  )
}

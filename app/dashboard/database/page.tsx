import { createClient } from "@/lib/supabase/server"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DatabaseView } from "@/components/dashboard/database-view"
import { redirect } from "next/navigation"

export default async function DatabasePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <DashboardShell>
      <DatabaseView />
    </DashboardShell>
  )
}

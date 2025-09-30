import { createClient } from "@/lib/supabase/server"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { MeditationsTable } from "@/components/dashboard/meditations-table"
import { redirect } from "next/navigation"

export default async function MeditationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <DashboardShell>
      <MeditationsTable />
    </DashboardShell>
  )
}

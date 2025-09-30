import { createClient } from "@/lib/supabase/server"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { PlaylistsTable } from "@/components/dashboard/playlists-table"
import { redirect } from "next/navigation"

export default async function PlaylistsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <DashboardShell>
      <PlaylistsTable />
    </DashboardShell>
  )
}

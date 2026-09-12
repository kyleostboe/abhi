"use client"

import { usePathname } from "next/navigation"
import { Navigation } from "@/components/navigation"

/**
 * Chrome that outlives a page change.
 *
 * Every page used to render its own `Navigation`, which meant a route change destroyed and
 * rebuilt it along with everything else — that rebuild is what read as a blink, and no amount of
 * transition animation could hide it because the DOM genuinely went away. Rendered from the
 * layout instead, this survives navigation: React keeps the same elements mounted and only the
 * page body below swaps out.
 *
 * Route-aware rather than unconditional, to preserve existing behaviour: the auth screens have
 * never shown the navigation, and the profile button only ever appeared on the three main pages.
 */
const PROFILE_ROUTES = ["/", "/library", "/journal"]

export function AppShell() {
  const pathname = usePathname()

  if (pathname.startsWith("/auth")) return null

  return <Navigation showProfileButton={PROFILE_ROUTES.includes(pathname)} />
}

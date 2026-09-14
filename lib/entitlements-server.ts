import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { ENTITLEMENT_COLUMNS, type Entitlements, entitlementsFromRow } from "@/lib/entitlements"
import { log } from "@/lib/log"

/**
 * Reads an account's entitlements.
 *
 * The row is readable by its owner under RLS, so this runs on the request-scoped client rather
 * than needing the service role — only *writing* a tier is privileged.
 *
 * Every failure path resolves to the free tier. A missing row is the ordinary case for an account
 * billing has never touched, and a query that errors is not a reason to hand out a paid tier, so
 * both land in the same place: `entitlementsFor` is total, and the cheap side is the safe default.
 */
export async function getEntitlements(
  supabase: SupabaseClient,
  profileId: string,
): Promise<Entitlements> {
  const { data, error } = await supabase
    .from("account_entitlements")
    .select(ENTITLEMENT_COLUMNS)
    .eq("profile_id", profileId)
    .maybeSingle()

  if (error) {
    log.warn("[entitlements] Falling back to the free tier:", error.message)
    return entitlementsFromRow(null)
  }

  return entitlementsFromRow(data)
}

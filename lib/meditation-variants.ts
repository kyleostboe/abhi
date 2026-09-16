/**
 * Telling a length variant apart from a meditation.
 *
 * A variant — the same meditation re-cut to another duration — gets its own `meditations` row,
 * linked back through `metadata.linkedParentId`. The Library groups those under one card, which is
 * what a person sees and counts.
 *
 * So the sync allowance counts cards, not rows. With the default quick-adjust presets one
 * meditation is four rows, and charging a slot for each would mean an allowance of fifteen ran out
 * at the fourth meditation someone actually named — a number they could see on screen and could
 * not reconcile with the limit they hit. Variants still cost storage; the byte quota is what
 * bounds that.
 *
 * Mirrored in SQL by `public.meditation_parent_id` (scripts/023). The database is what enforces
 * the limit; this is what lets the client predict it and avoid spending an upload to find out.
 *
 * Pure: no React, no network.
 */

/** Shape of the only field that matters here, so callers need not pass a whole meditation. */
export type VariantMetadata = { linkedParentId?: unknown } | null | undefined

/**
 * The parent this row is a length of, or null when it is a meditation in its own right.
 *
 * `linkedParentId` is client-written JSON that has been through export and import, so it can be
 * absent, blank, or not a string at all. Every one of those means "not a variant" rather than
 * anything worth failing over.
 */
export const parentIdOf = (metadata: VariantMetadata): string | null => {
  const raw = metadata?.linkedParentId
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Whether this row is a length of something else.
 *
 * A row pointing at itself is not a variant. That is not hypothetical: `save-meditation-dialog`
 * sets `linkedParentId` to the id of the meditation being replaced, and a self-referential value
 * would otherwise make a meditation invisible to its own limit.
 */
export const isVariantOf = (id: string, metadata: VariantMetadata): boolean => {
  const parentId = parentIdOf(metadata)
  return parentId !== null && parentId !== id
}

/** Counts what a person would count: meditations, with their lengths folded in. */
export const countBaseMeditations = (
  rows: Array<{ id: string; metadata?: VariantMetadata }>,
): number => rows.filter((row) => !isVariantOf(row.id, row.metadata)).length

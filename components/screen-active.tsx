"use client"

import { createContext, useContext } from "react"

/**
 * Whether the screen a component belongs to is the one being looked at.
 *
 * Needed the moment all three screens are mounted together. A mounted screen renders everything it
 * would render alone, and most of that is safely confined to its own column — but not everything.
 * `PageBefore` portals content *out* of the column to a slot above the card, so Home's debug button
 * turned up on the Library and the Journal as soon as they stopped being separate routes (measured
 * as exactly 22 characters of stray text on both).
 *
 * Its own module rather than living in `components/page-chrome.tsx`, which would make a cycle: the
 * chrome renders the strip, the strip renders the screens, and the screens import from the chrome.
 */
export const ScreenActiveContext = createContext(true)

/**
 * True when this screen is the current one. Default `true` so anything rendered outside a strip —
 * `/settings`, the auth screens — behaves exactly as it did.
 */
export function useScreenActive(): boolean {
  return useContext(ScreenActiveContext)
}

/**
 * The route exists for the URL, the back button and deep links — not for the content.
 *
 * All three screens are mounted together by `components/screen-strip.tsx`, which the layout's
 * chrome renders once and never unmounts. That is the whole of Option B: a swipe is a transform on
 * DOM that is already painted, so there is no render to wait for between lifting your finger and
 * the page moving, and both pages are genuinely on screen at once rather than being two snapshots
 * of pages that are not.
 *
 * Navigating here still changes the URL, which is what moves the strip to `/journal`.
 */
export default function Page() {
  return null
}

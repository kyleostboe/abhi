import { Loader2 } from "lucide-react"

/**
 * What Library and Journal show while their content is in flight.
 *
 * Deliberately **not** a card of its own. The card belongs to the layout now
 * (components/page-chrome.tsx) and is already on screen around this, so rendering another one
 * here would nest a card inside a card. This only fills the space the page's content will take.
 */
export function PageLoading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 pb-10 pt-24 md:pt-14">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  )
}

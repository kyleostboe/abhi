/**
 * Page transition.
 *
 * This used to animate the incoming page with framer-motion, and to sit out the animation when
 * the browser ran a real view transition instead. Branching on `"startViewTransition" in
 * document` is what made it wrong in two ways at once. The server has no `document`, so the two
 * environments disagreed about this element's initial style and React reported a hydration
 * mismatch on every load. And the disagreement put the whole document at `opacity: 0` in the DOM
 * at the moment the swipe navigator's `flushSync` let the browser snapshot the incoming state —
 * so the "new" frame of every swipe was a blank page. That blank is the white flash.
 *
 * So this now renders identical markup in both environments and animates nothing itself. The
 * fallback for browsers with no View Transitions API is a CSS animation keyed off
 * `data-nav-fallback`, which components/swipe-navigator.tsx sets only on the path that needs it
 * (see globals.css). Which mechanism runs is therefore decided at the moment of navigation, not
 * at render time, and exactly one of them can ever be active.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div data-page-enter>{children}</div>
}

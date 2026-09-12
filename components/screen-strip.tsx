"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

import { HomeScreen } from "@/components/screens/home-screen"
import { LibraryScreen } from "@/components/screens/library-screen"
import { JournalScreen } from "@/components/screens/journal-screen"
import { PAGE_SLIDE_EASING, PAGE_SLIDE_MS } from "@/lib/swipe-motion"
import { ScreenActiveContext } from "@/components/screen-active"

/**
 * All three screens, mounted at once, side by side.
 *
 * This is the shape the swipe always wanted and never had. Before it, one route was mounted at a
 * time: the outgoing page slid off and left bare card behind it, because there was genuinely
 * nothing to its right — measured, only ever one `[data-page-content]` in the DOM. The two-page
 * effect after release came from the View Transitions API cross-fading two *bitmaps*, which only
 * exist once the route has already committed. And committing meant rendering a 4.6k-line page
 * synchronously, which froze the screen for a measured 60-110ms between the finger lifting and
 * anything moving.
 *
 * Both of those are the same fact — one page mounted — so both go away together here. The strip is
 * ordinary painted DOM; a swipe is a transform on it.
 *
 * The order matches `ORDER` in `components/swipe-navigator.tsx` and `TABS` in
 * `components/navigation.tsx`. All three agree or nothing lines up.
 */
const SCREENS = [
  { path: "/", render: () => <HomeScreen /> },
  { path: "/library", render: () => <LibraryScreen /> },
  { path: "/journal", render: () => <JournalScreen /> },
] as const

/** `useLayoutEffect` warns during SSR, and the height has to be right before the first paint. */
const useMeasureEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

/**
 * Whether a screen is the one being looked at, and whether it may paint at all.
 *
 * The second is not a nicety. A mounted screen renders everything it would render alone —
 * including the things that escape its own box: the Library's full-screen player and the Timer's
 * running-sit overlay are both `position: fixed; inset: 0`. With every screen mounted, leaving the
 * Timer open on the Library and then walking to Home would paint the Library's timer over Home.
 * So an off-screen column is given `content-visibility: hidden`, which stops its subtree being
 * rendered or painted while keeping every bit of its React state — the point of mounting it.
 *
 * It is lifted the moment a drag starts, so the neighbour is real and painted before it needs to
 * be seen, and dropped again once the strip is at rest.
 */
export interface ScreenStripHandle {
  /** Reveal the neighbours, for the duration of a gesture. */
  wake(): void
}

export function ScreenStrip() {
  const pathname = usePathname()
  const index = Math.max(0, SCREENS.findIndex((s) => s.path === pathname))

  const stripRef = useRef<HTMLDivElement | null>(null)
  const columnRefs = useRef<(HTMLDivElement | null)[]>([])
  const [awake, setAwake] = useState(false)
  const [height, setHeight] = useState<number | null>(null)

  /**
   * The card's height follows the screen you are on, not the tallest of the three.
   *
   * The columns sit in a flex row, so without this the strip would be as tall as its tallest
   * member and the card would stop resizing between pages — which is a thing the chrome was
   * deliberately built to do (`page-card` used to interpolate its height through a view
   * transition). Measuring the active column and setting the height explicitly keeps that,
   * without the transition machinery.
   */
  const measure = useCallback(() => {
    const active = columnRefs.current[index]
    if (!active) return
    const next = active.offsetHeight
    setHeight((prev) => (prev !== null && Math.abs(prev - next) < 1 ? prev : next))
  }, [index])

  useMeasureEffect(() => {
    measure()
    const active = columnRefs.current[index]
    if (!active || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(active)
    return () => observer.disconnect()
  }, [measure, index])

  // A gesture needs its neighbours painted before it starts moving, and nothing else does. The
  // navigator raises this on touchstart via the attribute below rather than through a prop,
  // because it lives in the layout's other subtree and reaches the strip through the DOM.
  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const onWake = () => setAwake(true)
    const onRest = () => setAwake(false)
    strip.addEventListener("strip-wake", onWake)
    strip.addEventListener("strip-rest", onRest)
    return () => {
      strip.removeEventListener("strip-wake", onWake)
      strip.removeEventListener("strip-rest", onRest)
    }
  }, [])

  /**
   * The route changed — by a nav tap, the back button, or the navigator's own push at the end of a
   * swipe. Re-centre on the new column.
   *
   * The index and the offset move in the *same* commit, and that is what makes a committing swipe
   * seamless: the navigator has aimed the track one card further on at the old index, and one card
   * of offset at the old index is exactly zero offset at the new one. The transform's computed
   * value is unchanged, so the transition running through this commit never notices it happened.
   *
   * For a nav tap or the back button there is no offset to cancel, and `--strip-ms` is 0, so the
   * strip simply jumps to the new column. Giving those a slide too would mean animating from
   * wherever the last gesture left things, which is not always adjacent.
   */
  useMeasureEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    strip.style.setProperty("--strip-index", String(index))
    strip.style.setProperty("--strip-x", "0px")
    setAwake(false)
  }, [index])

  return (
    <div
      ref={stripRef}
      data-screen-strip
      data-strip-index={index}
      className="relative overflow-hidden"
      style={{
        height: height ?? undefined,
        // The height follows the active screen; the change is worth easing on the same clock the
        // slide uses, so a taller page does not snap open under a moving strip.
        transition: `height ${PAGE_SLIDE_MS}ms cubic-bezier(${PAGE_SLIDE_EASING.join(", ")})`,
      }}
    >
      <div
        data-strip-track
        className="flex w-full items-start"
        style={{
          // One column per screen, so the track is three cards wide and each column is a third.
          width: `${SCREENS.length * 100}%`,
          transform: `translate3d(calc(var(--strip-x, 0px) - var(--strip-index, 0) * ${100 / SCREENS.length}%), 0, 0)`,
          // 0ms unless the navigator is settling, so a finger moves the track with no lag at all
          // and a route change with no gesture behind it lands without sliding.
          transition: `transform var(--strip-ms, 0ms) cubic-bezier(${PAGE_SLIDE_EASING.join(", ")})`,
        }}
      >
        {SCREENS.map((screen, i) => {
          const active = i === index
          const visible = active || awake
          return (
            <div
              key={screen.path}
              ref={(node) => {
                columnRefs.current[i] = node
              }}
              data-screen={screen.path}
              data-active={active ? "" : undefined}
              // `inert` keeps an off-screen screen out of the tab order and away from screen
              // readers, which matters far more now that it is genuinely in the document.
              inert={!active}
              aria-hidden={!active}
              className="w-full shrink-0 grow-0"
              style={{
                width: `${100 / SCREENS.length}%`,
                contentVisibility: visible ? "visible" : "hidden",
              }}
            >
              <ScreenActiveContext.Provider value={active}>{screen.render()}</ScreenActiveContext.Provider>
            </div>
          )
        })}
      </div>
    </div>
  )
}

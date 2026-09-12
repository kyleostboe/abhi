"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { PAGE_SLIDE_EASING, PAGE_SLIDE_MS, SETTLE_MS } from "@/lib/swipe-motion"
import { setPill, snapLabels, tweenLabelsTo, tweenPillTo } from "@/lib/swipe-progress"

/**
 * Left/right swipe between the three main screens, in the order the navigation lists them.
 *
 * Touch only — a mouse drag stays a text selection. The gesture is deliberately conservative,
 * because plenty of this app already owns horizontal dragging: the Creator's timeline events, the
 * duration and threshold sliders, audio scrubbers, and any sideways-scrolling row. A swipe that
 * starts on one of those is left alone entirely, so navigation can never steal a drag.
 *
 * **What this used to be.** All three screens are mounted at once now
 * (`components/screen-strip.tsx`), so this file is a fraction of its former size. It used to drive
 * the View Transitions API: capture the outgoing page, `flushSync` a `router.push` inside the
 * transition callback, hold a promise open until the pathname committed, then hand the browser two
 * bitmaps to cross-fade. That was the only way to show two pages when only one was ever mounted —
 * and it cost a measured 60-110ms of completely frozen screen between the finger lifting and
 * anything moving, because rendering the destination is synchronous and blocks the main thread.
 *
 * None of it is needed. The destination is already in the document and already painted, so the
 * gesture is a transform, the release is an animation on that same transform, and the URL catches
 * up afterwards without anything waiting for it.
 */
const ORDER = ["/", "/library", "/journal"] as const

const MIN_DISTANCE = 64 // px of horizontal travel before it counts as a swipe
const MAX_OFF_AXIS = 0.5 // |dy| has to stay under half of |dx|, or it's a scroll
const MAX_DURATION = 800 // ms — a slow drag is someone doing something else

/**
 * The strip along each edge where the browser's own swipe-to-go-back gesture lives.
 *
 * `overscroll-behavior-x: none` in globals.css asks Chromium to stand down, but that is a hint
 * rather than a guarantee and Safari ignores it entirely — its back gesture is not
 * interceptable. A swipe that starts here therefore races our own navigation against a history
 * one, which is how a swipe ends up on a page it wasn't pointed at. Declining these outright is
 * the only reliable way to keep the two from fighting.
 */
const EDGE_ZONE = 24

/**
 * How far the finger has to travel before the page starts moving with it.
 *
 * Small on purpose — this is the point at which the gesture stops being ambiguous, not the point
 * at which it becomes a navigation. A drag shorter than `MIN_DISTANCE` still moves the page and
 * then springs back, which is how the gesture says "not far enough" without a wall.
 */
const DRAG_START = 8

/** The strip, and the track inside it that actually moves. */
const STRIP_SELECTOR = "[data-screen-strip]"
const TRACK_SELECTOR = "[data-strip-track]"

/** True if the OS is asking for less motion. */
function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** Gestures starting here belong to the thing under the finger, not to navigation. */
function ownsItsOwnDrag(target: Element | null): boolean {
  if (!target) return true
  if (
    target.closest(
      'input[type="range"], audio, video, [draggable="true"], [role="dialog"], [role="slider"], [data-no-swipe], [data-style-inspector-ui]',
    )
  ) {
    return true
  }
  // Anything that can actually scroll sideways should scroll rather than navigate.
  for (let el: Element | null = target; el && el !== document.body; el = el.parentElement) {
    // A `position: fixed` ancestor is the second reason to decline, and it is about what the drag
    // *does* rather than about what the finger meant. Moving the strip means giving it a
    // transform, and a transform anywhere above the page's own markup becomes the containing block
    // for every `position: fixed` inside it — so the Library's full-screen player would jump out
    // from under the card the moment a swipe started on it. A page you are looking at through a
    // fixed overlay is not one you are swiping between anyway. This is also what keeps a running
    // Timer sit from being swiped away.
    const style = getComputedStyle(el)
    if (style.position === "fixed") return true
    const overflowX = style.overflowX
    if ((overflowX === "auto" || overflowX === "scroll") && el.scrollWidth > el.clientWidth + 1) {
      return true
    }
  }
  return false
}

export function SwipeNavigator() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const index = ORDER.indexOf(pathname as (typeof ORDER)[number])
    if (index === -1) return // only the three main screens participate

    let startX = 0
    let startY = 0
    let startedAt = 0
    let tracking = false

    let strip: HTMLElement | null = null
    let track: HTMLElement | null = null
    /** One card's width — what a full screen of travel means. Read once at touchstart: reading it
        per move would be a forced layout on every frame of the gesture. */
    let cardW = 0
    let dragX = 0
    let dragging = false

    /** Move the track. Pixels rather than a percentage, because the finger is in pixels. */
    const setOffset = (px: number) => {
      strip?.style.setProperty("--strip-x", `${px}px`)
    }

    /** How long the track takes to reach whatever `--strip-x` says. 0 while a finger is on it. */
    const setClock = (ms: number) => {
      strip?.style.setProperty("--strip-ms", `${ms}ms`)
    }

    let restTimer = 0

    const rest = () => {
      window.clearTimeout(restTimer)
      setClock(0)
      if (strip) strip.dispatchEvent(new CustomEvent("strip-rest"))
      dragging = false
      dragX = 0
    }

    /**
     * Let the track travel to `to` over `ms`, as a CSS transition on its transform.
     *
     * A transition rather than a Web Animation, and the reason is the commit. On a committing
     * swipe the track is aimed a full card further on while `router.push` runs alongside it; when
     * the route lands, the strip re-centres on the new index and zeroes the offset. Those two
     * changes happen together and they cancel exactly — one card of offset at the old index *is*
     * zero offset at the new one — so the transform's computed value never changes and the
     * transition carries straight through the commit with no seam.
     *
     * A Web Animation could not do that. Its keyframes resolve when it starts, so it would finish,
     * be cancelled, and drop the track back to whatever the CSS said — which for one frame is the
     * screen you just left.
     */
    const settle = (to: number, ms: number) => {
      if (prefersReducedMotion()) {
        setClock(0)
        setOffset(to)
        rest()
        return
      }
      setClock(ms)
      setOffset(to)
      // `transitionend` does not fire if the value did not actually change, so the strip is put
      // back to sleep on a timer instead. Generous, because all it governs is when the neighbours
      // stop being painted.
      window.clearTimeout(restTimer)
      restTimer = window.setTimeout(rest, ms + 60)
    }

    const cancel = () => {
      tracking = false
      if (dragging) settle(0, SETTLE_MS)
      else rest()
    }

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || document.querySelector('[role="dialog"]')) return cancel()
      if (ownsItsOwnDrag(e.target as Element | null)) return cancel()
      const touch = e.touches[0]
      if (touch.clientX < EDGE_ZONE || touch.clientX > window.innerWidth - EDGE_ZONE) {
        return cancel()
      }
      startX = touch.clientX
      startY = touch.clientY
      startedAt = Date.now()
      tracking = true
      strip = document.querySelector<HTMLElement>(STRIP_SELECTOR)
      track = strip?.querySelector<HTMLElement>(TRACK_SELECTOR) ?? null
      cardW = strip?.offsetWidth ?? 0
      // Wake the neighbours *now*, while the finger is still down and before anything has to move.
      // This is the one piece of work the old design could not do early, because the neighbour did
      // not exist until the route committed.
      strip?.dispatchEvent(new CustomEvent("strip-wake"))
      dragging = false
      dragX = 0
    }

    const onMove = (e: TouchEvent) => {
      if (e.touches.length > 1) return cancel() // a second finger means pinch/zoom, not a swipe
      if (!tracking) return
      const touch = e.touches[0]
      if (!touch) return

      const dx = touch.clientX - startX
      const dy = touch.clientY - startY
      // The release's test, run continuously: a gesture that turns out to be a scroll has to stop
      // dragging the strip the moment it does, not at the end.
      if (Math.abs(dy) > Math.abs(dx) * MAX_OFF_AXIS) return cancel()
      if (Math.abs(dx) < DRAG_START) return

      // Nothing to move towards at either end of the strip, so nothing moves.
      const next = dx < 0 ? index + 1 : index - 1
      if (next < 0 || next >= ORDER.length) return

      const clamped = cardW > 0 ? Math.max(-cardW, Math.min(cardW, dx)) : dx
      setOffset(clamped)
      // The tab travels the same journey the screens do, expressed as a fraction of it.
      setPill(index, cardW > 0 ? clamped / cardW : 0)
      dragging = true
      dragX = clamped
    }

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return
      tracking = false
      const touch = e.changedTouches[0]
      if (!touch) return cancel()

      const dx = touch.clientX - startX
      const dy = touch.clientY - startY
      const next = dx < 0 ? index + 1 : index - 1
      const abandoned =
        Date.now() - startedAt > MAX_DURATION ||
        Math.abs(dx) < MIN_DISTANCE ||
        Math.abs(dy) > Math.abs(dx) * MAX_OFF_AXIS ||
        next < 0 ||
        next >= ORDER.length

      if (abandoned) {
        tweenPillTo(index, SETTLE_MS)
        tweenLabelsTo(index, SETTLE_MS)
        settle(0, SETTLE_MS)
        return
      }

      // Committing. The destination is already on screen — it has been since the finger went down
      // — so the strip simply finishes its travel, and the URL follows.
      //
      // A full card of travel from wherever the finger left it, on the slide's clock. Nothing
      // waits for React here: this animation runs on the compositor, and `router.push` happens
      // alongside it rather than before it.
      snapLabels(next)
      tweenPillTo(next, PAGE_SLIDE_MS)
      // The travel starts on this frame, on the compositor, owing nothing to React. The URL is
      // pushed alongside it rather than before it — which is the whole difference from the old
      // design, where nothing could move until the destination had finished rendering.
      settle(dx < 0 ? -cardW : cardW, PAGE_SLIDE_MS)
      router.push(ORDER[next], { scroll: false })
    }

    document.addEventListener("touchstart", onStart, { passive: true })
    document.addEventListener("touchmove", onMove, { passive: true })
    document.addEventListener("touchend", onEnd, { passive: true })
    document.addEventListener("touchcancel", cancel, { passive: true })
    return () => {
      document.removeEventListener("touchstart", onStart)
      document.removeEventListener("touchmove", onMove)
      document.removeEventListener("touchend", onEnd)
      document.removeEventListener("touchcancel", cancel)
    }
  }, [pathname, router])

  return null
}

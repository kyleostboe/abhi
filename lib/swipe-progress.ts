import { animate, motionValue, type MotionValue } from "framer-motion"

import { PAGE_SLIDE_EASING } from "@/lib/swipe-motion"

/**
 * Where the navigation's selection is, while a swipe is happening.
 *
 * The gesture lives in `components/swipe-navigator.tsx` and the pill lives in
 * `components/navigation.tsx`, and the two are in different trees — the nav is rendered by the
 * layout's shell, the navigator by the layout itself. This module is the wire between them: the
 * navigator writes, the nav reads, and nobody owns anybody.
 *
 * MotionValues rather than React state, and deliberately module-level rather than context. These
 * change on every `touchmove` frame; putting them through a render would make the nav re-render at
 * the frame rate of the finger, and the nav sits above the whole app.
 *
 * Both are in **tab-index space** — 0 is Home, 1 is Library, 2 is Journal, and 0.4 is a real
 * position four tenths of the way from Home to Library. The content travels a whole card (~896px
 * on desktop) while the tabs are 55-75px apart; expressing the progress as a fraction of the
 * journey rather than as pixels is what lets one gesture drive both geometries.
 */

/**
 * Drives the pill's `left` and `width`.
 *
 * Follows the finger, then **holds** through the 110-128ms the router takes to render the
 * destination — exactly as the content does, which is the point — and only then tweens to the
 * destination on the slide's own clock.
 */
export const pillPos: MotionValue<number> = motionValue(0)

/**
 * Drives the three labels' colours.
 *
 * The same value as `pillPos` for the whole drag, and then not: it **snaps** to the destination at
 * the instant the slide starts, while the pill is still back where the finger left it.
 *
 * The split exists for one frame and is not a refinement. The browser takes the incoming
 * view-transition snapshot at the moment the slide starts, and at that moment `pillPos` is still at
 * its dragged value. Deriving the label colours from `pillPos` too would bake a mid-drag blend into
 * that snapshot — the destination label sitting at 30% white for the whole 260ms. Snapping the
 * colours at the same instant the pill starts travelling gives the two snapshots something to
 * cross-fade *between*: what was on screen, and what it should be.
 */
export const labelPos: MotionValue<number> = motionValue(0)

/** True if the OS is asking for less motion — in which case every tween below becomes a jump. */
function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Framer wants a mutable array of control points; `PAGE_SLIDE_EASING` is a readonly tuple, because
 * everywhere else it is joined into a `cubic-bezier()` string.
 */
const EASE = [...PAGE_SLIDE_EASING] as [number, number, number, number]

/**
 * The pill's running tween, if there is one, kept so a finger can interrupt it.
 *
 * Starting a new animation on a MotionValue already stops the old one, but the drag does not start
 * an animation — it sets the value directly, every frame — and a tween still running would simply
 * overwrite it on the next tick.
 */
let pillTween: { stop: () => void } | null = null

function stopPillTween() {
  pillTween?.stop()
  pillTween = null
}

function tween(value: MotionValue<number>, target: number, ms: number) {
  if (ms <= 0 || prefersReducedMotion()) {
    value.set(target)
    return
  }
  return animate(value, target, { duration: ms / 1000, ease: EASE })
}

/**
 * The finger, mid-drag.
 *
 * `fraction` is the content's offset as a proportion of one card, signed the way the drag is: a
 * negative offset is the page being pushed left, which is travel *towards* the next tab. Hence the
 * subtraction — the pill goes the opposite way to the content, because the content is leaving and
 * the selection is arriving.
 */
export function setPill(index: number, fraction: number) {
  const position = index - fraction
  // A finger down always wins over a tween still running from the previous gesture.
  stopPillTween()
  pillPos.set(position)
  labelPos.set(position)
}

/** The pill travels to `target` over `ms`, with the labels left where they are. */
export function tweenPillTo(target: number, ms: number) {
  stopPillTween()
  const running = tween(pillPos, target, ms)
  if (!running) return
  pillTween = running
  // Cleared on arrival so `isPillTravelling` is false again once the pill is at rest, whether it
  // got there or was interrupted.
  void running.finished.catch(() => {}).finally(() => {
    if (pillTween === running) pillTween = null
  })
}

/** The labels' colours travel to `target` over `ms`. Used where nothing is snapshotting them. */
export function tweenLabelsTo(target: number, ms: number) {
  tween(labelPos, target, ms)
}

/** The labels' colours become the destination's, now, in one frame. */
export function snapLabels(target: number) {
  labelPos.set(target)
}

/**
 * True while the pill is travelling under its own steam.
 *
 * The nav asks before correcting the pill to match the route: a committing swipe changes the
 * pathname *during* the journey, and a correction at that moment would cut the journey short.
 */
export function isPillTravelling(): boolean {
  return pillTween !== null
}

/** Both, at rest, at `target`. For a navigation that was not a swipe. */
export function snapAll(target: number) {
  stopPillTween()
  pillPos.set(target)
  labelPos.set(target)
}


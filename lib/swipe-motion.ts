/**
 * The page slide's clock, shared by everything that has to move with it.
 *
 * This file used to hold more, and the history is worth keeping because it is the shape of the
 * problem retreating. First the slide resumed from the drag by starting its CSS animation part way
 * in, with a negative `animation-delay` — which meant inverting the easing curve, because a drag of
 * 29% of a card is not 29% of the animation (`cubic-bezier(0.22, 0.61, 0.36, 1)` has covered 88% of
 * its distance by half its duration). Then that went, replaced by a `--swipe-dx` handshake that
 * kept two view-transition snapshots exactly one card apart.
 *
 * Then the snapshots went too. All three screens are mounted at once now
 * (`components/screen-strip.tsx`), so a swipe is a transform on painted DOM and the settle is a
 * plain CSS transition on it. Every one of those mechanisms existed only to fake a second page
 * that was not there.
 *
 * What is left is the duration and the easing.
 */


/**
 * The slide's duration in milliseconds.
 *
 * Read by `components/swipe-navigator.tsx` (the settle) and `components/screen-strip.tsx` (the
 * card's height, which follows the screen you land on). Both import it, so unlike the CSS rules
 * this used to have to match by hand, there is nothing left to keep in step.
 */
export const PAGE_SLIDE_MS = 260

/** The slide's easing, as `cubic-bezier` control points. */
export const PAGE_SLIDE_EASING = [0.22, 0.61, 0.36, 1] as const

/**
 * How long the page takes to spring back after a gesture that did not navigate.
 *
 * Lives here rather than in `components/swipe-navigator.tsx`, where it started, because the nav
 * pill settles back on the same clock as the content it was following (`lib/swipe-progress.ts`).
 * Two things moving together have to read the one number.
 */
export const SETTLE_MS = 200

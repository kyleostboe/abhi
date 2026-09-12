/** A measured position and size, in the coordinates of some container. */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/**
 * A target's position and size in `container`'s coordinates, read from layout rather than from
 * `getBoundingClientRect`.
 *
 * The difference matters exactly once, and it was a real defect. The incoming labels are *sliding*
 * while the pill is being placed, and a client rect includes that slide — so the pill was measured
 * out at the layer's displaced position, arrived from the side with it, and chased it back. The
 * pill is the *selection*, and the selection does not enter from anywhere; it travels between the
 * two options, which means it wants the layout position. `offsetLeft` and `offsetTop` are layout
 * values, and a transform does not reach them.
 *
 * It is also simply truer than a client rect, which folds in scroll, zoom and — through the card's
 * `backdrop-blur` — whatever the compositor is doing. Both boxes are unpositioned in the chains
 * this is used on, so walking `offsetParent` lands on `container`'s padding edge, which for a
 * container with no padding and no border is the same origin the pill is positioned against.
 *
 * Shared by `components/mode-switch.tsx` and `components/navigation.tsx` — the two measured pills
 * in the app, and the reason there is not a third implementation of this.
 */
export function layoutBox(el: HTMLElement, container: HTMLElement): Box {
  let x = 0
  let y = 0
  for (
    let node: HTMLElement | null = el;
    node && node !== container;
    node = node.offsetParent as HTMLElement | null
  ) {
    x += node.offsetLeft
    y += node.offsetTop
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

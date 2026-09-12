import { describe, expect, it } from "vitest"

import { removeJsxElementAt } from "@/lib/dev/jsx-remove"

/** Line and column of `needle` in `source`, in the 1-based-line / 0-based-column convention the
 * dev loader and app/api/dev-style both use. */
function locate(source: string, needle: string): { line: number; column: number } {
  const offset = source.indexOf(needle)
  if (offset === -1) throw new Error(`not in source: ${needle}`)
  const before = source.slice(0, offset)
  const line = before.split("\n").length
  const column = offset - (before.lastIndexOf("\n") + 1)
  return { line, column }
}

function removeAt(source: string, needle: string) {
  const { line, column } = locate(source, needle)
  return removeJsxElementAt(source, line, column)
}

describe("removing a plain child", () => {
  const source = [
    "export function Screen() {",
    "  return (",
    "    <div>",
    "      <h1>Title</h1>",
    "      <p>Body</p>",
    "    </div>",
    "  )",
    "}",
    "",
  ].join("\n")

  it("takes the element and the line it sat on", () => {
    const result = removeAt(source, "<p>Body</p>")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toBe(
      ["export function Screen() {", "  return (", "    <div>", "      <h1>Title</h1>", "    </div>", "  )", "}", ""].join(
        "\n",
      ),
    )
    expect(result.removed).toBe("<p>Body</p>")
  })

  it("removes a self-closing element", () => {
    const withIcon = source.replace("<p>Body</p>", "<Bell />")
    const result = removeAt(withIcon, "<Bell />")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).not.toContain("<Bell />")
    expect(result.source).toContain("<h1>Title</h1>")
  })

  it("removes an element that shares its line with siblings, leaving the line", () => {
    const oneLine = ["export function Screen() {", "  return <div><span>a</span><span>b</span></div>", "}", ""].join(
      "\n",
    )
    const result = removeAt(oneLine, "<span>a</span>")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toBe(
      ["export function Screen() {", "  return <div><span>b</span></div>", "}", ""].join("\n"),
    )
  })

  it("leaves the rest of the file exactly as it was", () => {
    const result = removeAt(source, "<h1>Title</h1>")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toContain("export function Screen() {")
    expect(result.source).toContain("<p>Body</p>")
    expect(result.source).toContain("</div>")
  })

  it("removes an element that is the only thing in an expression container", () => {
    const wrapped = ["export function Screen() {", "  return <div>{<span>a</span>}</div>", "}", ""].join("\n")
    const result = removeAt(wrapped, "<span>a</span>")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toBe(["export function Screen() {", "  return <div>{}</div>", "}", ""].join("\n"))
  })
})

describe("refusals", () => {
  it("refuses an element behind a condition", () => {
    const source = [
      "export function Screen() {",
      "  return <div>{ready && <span>a</span>}</div>",
      "}",
      "",
    ].join("\n")
    const result = removeAt(source, "<span>a</span>")
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("expression")
  })

  it("refuses an element that is the body of a map", () => {
    const source = [
      "export function Screen() {",
      "  return <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>",
      "}",
      "",
    ].join("\n")
    const result = removeAt(source, "<li key={item}>")
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("expression")
  })

  it("refuses a location with no element on it", () => {
    const source = ["export function Screen() {", "  return <div>a</div>", "}", ""].join("\n")
    const result = removeJsxElementAt(source, 1, 0)
    // Line 1 is `export function Screen() {`, which no element's tag spans.
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("No JSX element")
  })

  it("refuses source it cannot parse rather than guessing", () => {
    const result = removeJsxElementAt("this is not javascript ((((", 1, 0)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain("could not parse")
  })
})

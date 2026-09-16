import { describe, expect, it } from "vitest"

import { countBaseMeditations, isVariantOf, parentIdOf } from "./meditation-variants"

describe("parentIdOf", () => {
  it("reads a linked parent", () => {
    expect(parentIdOf({ linkedParentId: "abc" })).toBe("abc")
  })

  it("trims surrounding whitespace", () => {
    expect(parentIdOf({ linkedParentId: "  abc  " })).toBe("abc")
  })

  // All of these are values the column can actually hold: metadata is client-written JSON that has
  // been through an export and an import, so none of them are worth failing a save over.
  it.each([null, undefined, {}, { linkedParentId: "" }, { linkedParentId: "   " }])(
    "returns null for %p",
    (metadata) => {
      expect(parentIdOf(metadata as never)).toBeNull()
    },
  )

  it.each([0, 1, true, [], {}, null])("returns null for a non-string id %p", (raw) => {
    expect(parentIdOf({ linkedParentId: raw })).toBeNull()
  })
})

describe("isVariantOf", () => {
  it("is true for a row pointing at another meditation", () => {
    expect(isVariantOf("child", { linkedParentId: "parent" })).toBe(true)
  })

  it("is false for a row with no parent", () => {
    expect(isVariantOf("solo", {})).toBe(false)
    expect(isVariantOf("solo", null)).toBe(false)
  })

  // save-meditation-dialog sets linkedParentId to the id of the meditation being replaced, so a
  // self-referential value is reachable — and a meditation that counted as its own variant would
  // be invisible to the limit.
  it("is false for a row pointing at itself", () => {
    expect(isVariantOf("same", { linkedParentId: "same" })).toBe(false)
  })

  it("ignores whitespace when comparing to itself", () => {
    expect(isVariantOf("same", { linkedParentId: "  same  " })).toBe(false)
  })
})

describe("countBaseMeditations", () => {
  it("counts an empty library as zero", () => {
    expect(countBaseMeditations([])).toBe(0)
  })

  it("counts meditations with no variants", () => {
    expect(countBaseMeditations([{ id: "a" }, { id: "b" }, { id: "c" }])).toBe(3)
  })

  // The case that made this necessary: the default quick-adjust presets are 10m/30m/1h, so one
  // meditation someone has adjusted is four rows and one card.
  it("counts one meditation with three lengths as one", () => {
    const rows = [
      { id: "base" },
      { id: "v1", metadata: { linkedParentId: "base" } },
      { id: "v2", metadata: { linkedParentId: "base" } },
      { id: "v3", metadata: { linkedParentId: "base" } },
    ]
    expect(rows).toHaveLength(4)
    expect(countBaseMeditations(rows)).toBe(1)
  })

  it("counts several adjusted meditations by their cards", () => {
    const rows = ["a", "b", "c"].flatMap((id) => [
      { id },
      { id: `${id}-10m`, metadata: { linkedParentId: id } },
      { id: `${id}-30m`, metadata: { linkedParentId: id } },
      { id: `${id}-1h`, metadata: { linkedParentId: id } },
    ])
    expect(rows).toHaveLength(12)
    expect(countBaseMeditations(rows)).toBe(3)
  })

  it("still counts a variant whose parent id is unusable", () => {
    expect(countBaseMeditations([{ id: "a", metadata: { linkedParentId: "   " } }])).toBe(1)
  })
})

import { describe, expect, it } from "vitest"

import { applyTokenToClassList, classifyToken, findTokenForCategory } from "@/lib/dev/tailwind-edit"

describe("classifyToken — font family", () => {
  it("classifies the three families", () => {
    expect(classifyToken("font-sans")).toBe("font-family")
    expect(classifyToken("font-serif")).toBe("font-family")
    expect(classifyToken("font-mono")).toBe("font-family")
  })

  it("does not confuse a weight for a family", () => {
    expect(classifyToken("font-black")).toBe("font-weight")
    expect(classifyToken("font-normal")).toBe("font-weight")
  })

  it("leaves anything else under font- alone", () => {
    expect(classifyToken("font-stretch-expanded")).toBeNull()
  })
})

describe("classifyToken — box shadow", () => {
  it("classifies outer sizes, including the bare token", () => {
    for (const t of ["shadow", "shadow-none", "shadow-2xs", "shadow-sm", "shadow-md", "shadow-2xl"]) {
      expect(classifyToken(t)).toBe("box-shadow")
    }
  })

  it("classifies inner shadows into the same category, so one replaces the other", () => {
    expect(classifyToken("inset-shadow-sm")).toBe("box-shadow")
    expect(classifyToken("inset-shadow-recess")).toBe("box-shadow")
    expect(applyTokenToClassList("bg-white shadow-2xl", "box-shadow", "inset-shadow-recess")).toBe(
      "bg-white inset-shadow-recess",
    )
  })

  it("classifies an arbitrary shadow", () => {
    expect(classifyToken("shadow-[inset_0_2px_5px_rgb(0_0_0/0.12)]")).toBe("box-shadow")
  })

  it("leaves a shadow *colour* unclassified — it is a different property", () => {
    expect(classifyToken("shadow-gray-500")).toBeNull()
    expect(classifyToken("shadow-black/20")).toBeNull()
  })
})

describe("classifyToken — text align", () => {
  it("classifies the six alignment keywords", () => {
    for (const t of ["text-left", "text-center", "text-right", "text-justify", "text-start", "text-end"]) {
      expect(classifyToken(t)).toBe("text-align")
    }
  })

  it("does not take a size or a colour for alignment", () => {
    expect(classifyToken("text-xs")).toBe("font-size")
    expect(classifyToken("text-[11px]")).toBe("font-size")
    expect(classifyToken("text-gray-600")).toBe("text-color")
  })

  it("swaps alignment without disturbing the size", () => {
    expect(applyTokenToClassList("text-xs font-black text-left", "text-align", "text-center")).toBe(
      "text-xs font-black text-center",
    )
  })

  it("the reverse: a size edit no longer strips the alignment", () => {
    expect(applyTokenToClassList("text-center font-black text-xs", "font-size", "text-lg")).toBe(
      "text-center font-black text-lg",
    )
  })

  it("clears alignment when given no token", () => {
    expect(applyTokenToClassList("text-center text-xs", "text-align", null)).toBe("text-xs")
  })
})

describe("text decoration is nobody's category", () => {
  it("is left unclassified rather than claimed as a size", () => {
    for (const t of ["text-wrap", "text-nowrap", "text-balance", "text-pretty", "text-ellipsis", "text-clip"]) {
      expect(classifyToken(t)).toBeNull()
    }
  })

  it("survives an edit to something else on the same element", () => {
    expect(applyTokenToClassList("text-balance text-xs text-gray-600", "font-size", "text-lg")).toBe(
      "text-balance text-gray-600 text-lg",
    )
  })
})

describe("applyTokenToClassList / findTokenForCategory", () => {
  it("replaces a family without touching the weight", () => {
    expect(applyTokenToClassList("font-serif text-xs font-black", "font-family", "font-sans")).toBe(
      "text-xs font-black font-sans",
    )
  })

  it("clears a category when given no token", () => {
    expect(applyTokenToClassList("font-serif text-xs", "font-family", null)).toBe("text-xs")
  })

  it("finds what is already set", () => {
    expect(findTokenForCategory("rounded-xl shadow-md", "box-shadow")).toBe("shadow-md")
    expect(findTokenForCategory("rounded-xl shadow-md", "font-family")).toBeNull()
  })
})

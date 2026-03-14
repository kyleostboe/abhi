"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"

type FormSnapshot = Record<string, string>

type PageSnapshot = {
  scrollX: number
  scrollY: number
  formData: FormSnapshot
}

const snapshotKey = (pathname: string) => `abhi_page_snapshot:${pathname}`

const getFieldKey = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
  if (element.id) return `id:${element.id}`
  if (element.name) return `name:${element.name}`
  return null
}

const collectFormData = (): FormSnapshot => {
  const fields = Array.from(document.querySelectorAll("input, textarea, select")) as Array<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >
  const formData: FormSnapshot = {}

  fields.forEach((field) => {
    const key = getFieldKey(field)
    if (!key) return

    if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
      formData[key] = field.checked ? "1" : "0"
      return
    }

    formData[key] = field.value
  })

  return formData
}

const restoreFormData = (formData: FormSnapshot) => {
  Object.entries(formData).forEach(([key, value]) => {
    const [selectorType, selectorValue] = key.split(":")
    if (!selectorType || !selectorValue) return

    const selector = selectorType === "id" ? `#${CSS.escape(selectorValue)}` : `[name="${CSS.escape(selectorValue)}"]`
    const field = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null

    if (!field) return

    if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
      field.checked = value === "1"
      field.dispatchEvent(new Event("change", { bubbles: true }))
      return
    }

    field.value = value
    field.dispatchEvent(new Event("input", { bubbles: true }))
    field.dispatchEvent(new Event("change", { bubbles: true }))
  })
}

export function PageStatePreserver() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === "undefined" || !pathname) return

    const saveSnapshot = () => {
      try {
        const snapshot: PageSnapshot = {
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          formData: collectFormData(),
        }
        window.sessionStorage.setItem(snapshotKey(pathname), JSON.stringify(snapshot))
      } catch (error) {
        console.warn("[v0] Unable to save page snapshot", error)
      }
    }

    const snapshotRaw = window.sessionStorage.getItem(snapshotKey(pathname))
    if (snapshotRaw) {
      try {
        const snapshot = JSON.parse(snapshotRaw) as PageSnapshot
        requestAnimationFrame(() => {
          restoreFormData(snapshot.formData)
          window.scrollTo(snapshot.scrollX ?? 0, snapshot.scrollY ?? 0)
        })
      } catch (error) {
        console.warn("[v0] Unable to restore page snapshot", error)
      }
    }

    window.addEventListener("beforeunload", saveSnapshot)
    window.addEventListener("pagehide", saveSnapshot)

    return () => {
      saveSnapshot()
      window.removeEventListener("beforeunload", saveSnapshot)
      window.removeEventListener("pagehide", saveSnapshot)
    }
  }, [pathname])

  return null
}

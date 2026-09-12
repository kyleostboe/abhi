"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import type { StyleCategory } from "@/lib/dev/tailwind-edit"

// Dev-only visual style editor.
//
// Click an element to open a panel for it; click others to open more (they can span pages, since
// this lives in the root layout and survives client-side navigation). Each panel previews its
// changes live on the DOM via inline styles, then Save writes real Tailwind classes into the
// source (app/api/dev-style/route.ts). Each panel also carries a note thread to Claude
// (app/api/dev-notes/route.ts) for changes you'd rather describe than dial in by hand.
//
// Panels are only rendered on the page their element belongs to — a panel whose element isn't in
// the document can't preview or highlight anything, and leaving them all on screen made it
// impossible to tell which panel drove which element. Off-page work is surfaced as a count in the
// toolbar instead, and everything stays saveable from anywhere since saving only needs the source
// location.
//
// Never rendered outside `next dev` — see the mount guard in app/layout.tsx.

interface Source {
  fileName: string
  lineNumber: number
  columnNumber: number
}

interface PendingValue {
  token: string | null
  css: string
}

interface Selection {
  id: string
  source: Source
  tag: string
  page: string
  color: string
  z: number
  attached: boolean
  pending: Partial<Record<StyleCategory, PendingValue>>
  currentValues: Record<string, string>
  note: string
  linked: boolean
  model: string
  effort: string
  threadId: string | null
  pos: { x: number; y: number }
  size: { width: number; height: number }
  minimized: boolean
  showThread: boolean
  status: string
  lastSeenReplyAt: string | null
}

interface NoteMessage {
  role: "user" | "claude"
  text: string
  at: string
}

interface NoteThread {
  id: string
  status: "awaiting-claude" | "answered"
  elements: { file: string; line: number; column: number; tag: string; page: string }[]
  messages: NoteMessage[]
}

const STORAGE_KEY = "abhi-style-inspector-selections"

// Distinct hues so a panel, its element outline, and its minimized dot are obviously the same
// thing when several are open at once.
const PALETTE = ["#2563eb", "#16a34a", "#db2777", "#ea580c", "#7c3aed", "#0891b2", "#ca8a04", "#dc2626"]

const THEME_COLORS = [
  "background",
  "foreground",
  "card",
  "primary",
  "secondary",
  "muted",
  "accent",
  "destructive",
  "border",
]

// "Auto" leaves the note for whichever Claude Code session is watching to handle directly; the
// others are a request to hand it to a subagent running that specific model instead.
const MODEL_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "opus", label: "Opus" },
  { value: "sonnet", label: "Sonnet" },
  { value: "haiku", label: "Haiku" },
]

// There's no API to actually throttle a subagent's reasoning budget from here, so this rides
// along as a strong hint read at reply time rather than a real dial — see the note on
// NoteMessage.effort in app/api/dev-notes/route.ts.
const EFFORT_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "X-High" },
  { value: "max", label: "Max" },
]

const RADIUS_PRESETS = ["none", "sm", "md", "lg", "xl", "2xl", "3xl", "full"]
const WEIGHT_PRESETS = ["thin", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"]
const SIZE_PRESETS = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl"]
const FAMILY_PRESETS = ["sans", "serif", "mono"]
// Outer shadows first, then the inner ones — `inset-shadow-recess` is the project's own (see the
// `@theme` block in app/globals.css); Tailwind's built-in inset scale stops at `sm` and is too
// faint to read against this page's gradient.
const SHADOW_PRESETS = [
  "none",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "inset-recess",
  "inset-sm",
  "inset-xs",
]

// Approximate CSS for instant preview of named presets — the project's own CSS variables where
// they exist (exact), Tailwind v4's stable default scale otherwise (close enough until Save
// triggers a real re-render from the actual generated class).
const RADIUS_CSS: Record<string, string> = {
  none: "0px",
  sm: "var(--radius-sm, 6px)",
  md: "var(--radius-md, 8px)",
  lg: "var(--radius-lg, 12px)",
  xl: "12px",
  "2xl": "16px",
  "3xl": "24px",
  full: "9999px",
}
const WEIGHT_CSS: Record<string, string> = {
  thin: "100",
  light: "300",
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
  black: "900",
}
const SIZE_CSS: Record<string, string> = {
  xs: "12px",
  sm: "14px",
  base: "16px",
  lg: "18px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "30px",
  "4xl": "36px",
  "5xl": "48px",
}

const FAMILY_CSS: Record<string, string> = {
  sans: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)",
  serif: "var(--font-serif, ui-serif, Georgia, serif)",
  mono: "var(--font-mono, ui-monospace, SFMono-Regular, monospace)",
}

// Unlike the other preset rows there is no CSS map to go with this one: the preset name *is* the
// CSS value, so `stage` is handed the same string as both the token suffix and the preview.
const ALIGN_PRESETS = ["left", "center", "right", "justify"]

/** The token to write for each shadow preset, and the CSS to preview it with. */
const SHADOW_TOKEN: Record<string, string> = {
  none: "shadow-none",
  xs: "shadow-xs",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
  "2xl": "shadow-2xl",
  "inset-recess": "inset-shadow-recess",
  "inset-sm": "inset-shadow-sm",
  "inset-xs": "inset-shadow-xs",
}
const SHADOW_CSS: Record<string, string> = {
  none: "none",
  xs: "0 1px 1px rgb(0 0 0 / 0.05)",
  sm: "0 1px 3px rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  "inset-recess": "inset 0 2px 5px rgb(0 0 0 / 0.12)",
  "inset-sm": "inset 0 2px 4px rgb(0 0 0 / 0.05)",
  "inset-xs": "inset 0 1px 1px rgb(0 0 0 / 0.05)",
}

const CSS_PROP: Record<StyleCategory, keyof CSSStyleDeclaration | (keyof CSSStyleDeclaration)[]> = {
  "padding-top": "paddingTop",
  "padding-right": "paddingRight",
  "padding-bottom": "paddingBottom",
  "padding-left": "paddingLeft",
  "padding-x": ["paddingLeft", "paddingRight"],
  "padding-y": ["paddingTop", "paddingBottom"],
  padding: "padding",
  "margin-top": "marginTop",
  "margin-right": "marginRight",
  "margin-bottom": "marginBottom",
  "margin-left": "marginLeft",
  "margin-x": ["marginLeft", "marginRight"],
  "margin-y": ["marginTop", "marginBottom"],
  margin: "margin",
  gap: "gap",
  "gap-x": "columnGap",
  "gap-y": "rowGap",
  "background-color": "backgroundColor",
  "text-color": "color",
  "text-align": "textAlign",
  "border-color": "borderColor",
  "border-width": "borderWidth",
  "border-radius": "borderRadius",
  "font-size": "fontSize",
  "font-weight": "fontWeight",
  "font-family": "fontFamily",
  "box-shadow": "boxShadow",
  width: "width",
  height: "height",
}

function locKey(s: Source) {
  return `${s.fileName}:${s.lineNumber}:${s.columnNumber}`
}

/**
 * Elements are found by the `data-devloc="file:line:col"` attribute that
 * devtools/dev-loc-loader.cjs injects at build time (see next.config.mjs). Plain DOM lookup —
 * deliberately not React's own per-element debug info: React 19 only captures that accurately for
 * the first 10,000 JSX elements created in a page session and silently degrades to a shared,
 * useless stack after that, which a page this size and this animation-heavy blows through almost
 * immediately. It's also what makes a selection re-findable after a navigation or a refresh.
 */
function queryByLoc(source: Source): HTMLElement | null {
  return document.querySelector(`[data-devloc="${locKey(source)}"]`)
}

function parseLoc(raw: string): Source | null {
  const m = raw.match(/^(.*):(\d+):(\d+)$/)
  if (!m) return null
  return { fileName: m[1], lineNumber: Number(m[2]), columnNumber: Number(m[3]) }
}

function rgbToHex(rgb: string): string {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return "#000000"
  const toHex = (n: string) => Math.min(255, Number(n)).toString(16).padStart(2, "0")
  return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`
}

function pxOf(value: string): string {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? String(Math.round(n)) : ""
}

/** Snapshot the element's current resolved styles, used only to prefill the panel's inputs so you
 * can see what a property already is before changing it. */
function readCurrentValues(el: Element): Record<string, string> {
  const cs = window.getComputedStyle(el)
  return {
    paddingTop: pxOf(cs.paddingTop),
    paddingRight: pxOf(cs.paddingRight),
    paddingBottom: pxOf(cs.paddingBottom),
    paddingLeft: pxOf(cs.paddingLeft),
    marginTop: pxOf(cs.marginTop),
    marginRight: pxOf(cs.marginRight),
    marginBottom: pxOf(cs.marginBottom),
    marginLeft: pxOf(cs.marginLeft),
    columnGap: pxOf(cs.columnGap),
    rowGap: pxOf(cs.rowGap),
    backgroundColor: rgbToHex(cs.backgroundColor),
    color: rgbToHex(cs.color),
    textAlign: cs.textAlign,
    borderColor: rgbToHex(cs.borderTopColor),
    borderWidth: pxOf(cs.borderTopWidth),
    borderRadius: pxOf(cs.borderTopLeftRadius),
    fontSize: pxOf(cs.fontSize),
    fontWeight: cs.fontWeight,
    // Trimmed to the first family — the full stack is a paragraph and the panel has one line.
    fontFamily: (cs.fontFamily.split(",")[0] ?? "").replace(/["']/g, "").trim(),
    boxShadow: cs.boxShadow === "none" ? "none" : cs.boxShadow,
    width: pxOf(cs.width),
    height: pxOf(cs.height),
  }
}

function writeStyle(el: HTMLElement, category: StyleCategory, cssValue: string) {
  const props = CSS_PROP[category]
  const list = Array.isArray(props) ? props : [props]
  for (const p of list) {
    ;(el.style as any)[p] = cssValue
  }
}

function applyPending(el: HTMLElement, pending: Selection["pending"]) {
  for (const [category, value] of Object.entries(pending) as [StyleCategory, PendingValue][]) {
    writeStyle(el, category, value.css)
  }
}

function revertPending(el: HTMLElement, pending: Selection["pending"]) {
  for (const category of Object.keys(pending) as StyleCategory[]) {
    writeStyle(el, category, "")
  }
}

async function pushEdit(source: Source, category: StyleCategory, token: string | null) {
  const res = await fetch("/api/dev-style", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file: source.fileName,
      line: source.lineNumber,
      column: source.columnNumber,
      category,
      token,
    }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || "edit failed")
  return data as { ok: true; appliedClass: string | null; note?: string }
}

function describeChanges(sel: Selection): string[] {
  return (Object.entries(sel.pending) as [StyleCategory, PendingValue][]).map(
    ([category, v]) => `${category}: ${v.token ?? "(cleared)"}`,
  )
}

function Row({
  label,
  onNumber,
  defaultValue,
}: {
  label: string
  onNumber: (px: number | null) => void
  defaultValue?: string
}) {
  return (
    <label style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <input
        type="number"
        // `type="number"` defaults to step=1, which marks a legitimate 3.5px as invalid and makes
        // the spinner arrows snap back to whole pixels. Every field here is a raw px value, and
        // fractional ones are real (a 3.5px radius reads differently from 3px), so allow any step.
        step="any"
        placeholder="px"
        defaultValue={defaultValue}
        style={inputStyle}
        onChange={(e) => {
          const v = e.target.value
          onNumber(v === "" ? null : Number(v))
        }}
      />
    </label>
  )
}

function PresetRow({ presets, onPick }: { presets: string[]; onPick: (preset: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
      {presets.map((p) => (
        <button key={p} style={chipStyle} onClick={() => onPick(p)}>
          {p}
        </button>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 10, borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6b7280" }}>{title}</div>
      {children}
    </div>
  )
}

/** Shared pointer-drag helper: reports movement, and whether it stayed still enough to count as a
 * click (which is what lets a minimized dot be both draggable and clickable). */
function beginDrag(
  e: React.PointerEvent,
  onMove: (dx: number, dy: number) => void,
  onClickInstead?: () => void,
) {
  e.preventDefault()
  const startX = e.clientX
  const startY = e.clientY
  let moved = false
  const move = (ev: PointerEvent) => {
    const dx = ev.clientX - startX
    const dy = ev.clientY - startY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true
    onMove(dx, dy)
  }
  const up = () => {
    window.removeEventListener("pointermove", move)
    window.removeEventListener("pointerup", up)
    if (!moved) onClickInstead?.()
  }
  window.addEventListener("pointermove", move)
  window.addEventListener("pointerup", up)
}

function Panel({
  sel,
  index,
  thread,
  zIndex,
  onStage,
  onSave,
  onDelete,
  onSend,
  onReply,
  onClose,
  onPatch,
  onRaise,
}: {
  sel: Selection
  index: number
  thread: NoteThread | undefined
  zIndex: number
  onStage: (id: string, category: StyleCategory, token: string | null, css: string) => void
  onSave: (id: string) => void
  onDelete: (id: string) => void
  onSend: (id: string) => void
  onReply: (id: string, text: string) => void
  onClose: (id: string) => void
  onPatch: (id: string, patch: Partial<Selection>) => void
  onRaise: (id: string) => void
}) {
  const [replyDraft, setReplyDraft] = useState("")
  const originRef = useRef({ x: 0, y: 0 })

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-no-drag]")) return
      originRef.current = { x: sel.pos.x, y: sel.pos.y }
      beginDrag(e, (dx, dy) =>
        onPatch(sel.id, { pos: { x: originRef.current.x + dx, y: originRef.current.y + dy } }),
      )
    },
    [sel.id, sel.pos.x, sel.pos.y, onPatch],
  )

  const startResize = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      const origW = sel.size.width
      const origH = sel.size.height
      beginDrag(e, (dx, dy) =>
        onPatch(sel.id, {
          size: {
            width: Math.max(240, Math.min(window.innerWidth - 32, origW + dx)),
            height: Math.max(160, Math.min(window.innerHeight - 32, origH + dy)),
          },
        }),
      )
    },
    [sel.id, sel.size.width, sel.size.height, onPatch],
  )

  const pendingCount = Object.keys(sel.pending).length
  const cv = sel.currentValues
  const lastMessage = thread?.messages[thread.messages.length - 1]
  const hasUnread = !!lastMessage && lastMessage.role === "claude" && lastMessage.at !== sel.lastSeenReplyAt
  const awaiting = thread?.status === "awaiting-claude"

  const stage = (category: StyleCategory, token: string | null, css: string) =>
    onStage(sel.id, category, token, css)

  if (sel.minimized) {
    return (
      <button
        data-style-inspector-ui
        title={`${sel.tag} — ${sel.source.fileName.split("/").pop()}:${sel.source.lineNumber} (click to restore)`}
        onPointerDown={(e) => {
          onRaise(sel.id)
          originRef.current = { x: sel.pos.x, y: sel.pos.y }
          beginDrag(
            e,
            (dx, dy) => onPatch(sel.id, { pos: { x: originRef.current.x + dx, y: originRef.current.y + dy } }),
            () => onPatch(sel.id, { minimized: false }),
          )
        }}
        style={{
          ...dotStyle,
          left: sel.pos.x,
          top: sel.pos.y,
          zIndex,
          background: sel.color,
          boxShadow: hasUnread ? `0 0 0 3px #16a34a, 0 2px 8px rgba(0,0,0,0.3)` : "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        {index + 1}
        {(pendingCount > 0 || hasUnread) && <span style={dotBadgeStyle} />}
      </button>
    )
  }

  return (
    <div
      data-style-inspector-ui
      onPointerDown={() => onRaise(sel.id)}
      style={{
        ...panelStyle,
        left: sel.pos.x,
        top: sel.pos.y,
        width: sel.size.width,
        height: sel.size.height,
        zIndex,
        borderColor: sel.color,
      }}
    >
      <div onPointerDown={startDrag} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "move" }}>
        <span style={{ ...swatchStyle, background: sel.color }}>{index + 1}</span>
        <strong style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          &lt;{sel.tag}&gt; {sel.source.fileName.split("/").pop()}:{sel.source.lineNumber}
        </strong>
        {(thread || awaiting) && (
          <button
            data-no-drag
            title={hasUnread ? "Claude replied" : awaiting ? "Sent — waiting on Claude" : "Note thread"}
            onClick={() =>
              onPatch(sel.id, {
                showThread: !sel.showThread,
                lastSeenReplyAt: lastMessage?.role === "claude" ? lastMessage.at : sel.lastSeenReplyAt,
              })
            }
            style={{
              ...iconButtonStyle,
              background: hasUnread ? "#16a34a" : awaiting ? "#f59e0b" : "#e5e7eb",
              color: hasUnread || awaiting ? "white" : "#374151",
            }}
          >
            {hasUnread ? "● reply" : awaiting ? "…sent" : "chat"}
          </button>
        )}
        <button
          data-no-drag
          title="Minimize to dot"
          onClick={() => onPatch(sel.id, { minimized: true })}
          style={iconButtonStyle}
        >
          –
        </button>
        <button data-no-drag title="Close panel" onClick={() => onClose(sel.id)} style={closeButtonStyle}>
          ×
        </button>
      </div>

      {!sel.attached && (
        <div style={{ fontSize: 10, color: "#b45309", marginTop: 2 }}>Element not on screen right now</div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
        <button
          onClick={() => onSave(sel.id)}
          disabled={pendingCount === 0}
          style={{
            ...saveButtonStyle,
            opacity: pendingCount === 0 ? 0.4 : 1,
            cursor: pendingCount === 0 ? "default" : "pointer",
          }}
        >
          Save{pendingCount > 0 ? ` (${pendingCount})` : ""}
        </button>
        {/* Delete rewrites the file, so it asks first — there is no undo in here, and unlike a
            staged style it is not recoverable by closing the panel. */}
        <button onClick={() => onDelete(sel.id)} style={deleteButtonStyle} title="Remove this element from the source">
          Delete
        </button>
        <label style={{ fontSize: 11, color: "#374151", display: "flex", alignItems: "center", gap: 3 }}>
          <input
            type="checkbox"
            checked={sel.linked}
            onChange={(e) => onPatch(sel.id, { linked: e.target.checked })}
          />
          link
        </label>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>
          {pendingCount > 0 ? "previewing, unsaved" : "no unsaved changes"}
        </span>
      </div>

      {sel.status && (
        <div
          style={{
            fontSize: 11,
            marginTop: 4,
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
            color: sel.status.startsWith("Error") ? "#ef4444" : "#6b7280",
          }}
        >
          {sel.status}
        </div>
      )}

      {sel.showThread ? (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", marginTop: 8 }}>
          {(thread?.messages ?? []).map((m, i) => (
            <div
              key={i}
              style={{
                marginBottom: 8,
                padding: 6,
                borderRadius: 6,
                background: m.role === "claude" ? "#f0fdf4" : "#f3f4f6",
              }}
            >
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>
                {m.role === "claude" ? "Claude" : "You"}
              </div>
              <div style={{ fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.text}</div>
            </div>
          ))}
          <textarea
            value={replyDraft}
            onChange={(e) => setReplyDraft(e.target.value)}
            placeholder="Reply with more context…"
            style={{ ...textareaStyle, minHeight: 54 }}
          />
          <button
            onClick={() => {
              if (!replyDraft.trim()) return
              onReply(sel.id, replyDraft)
              setReplyDraft("")
            }}
            style={{ ...sendButtonStyle, marginTop: 4 }}
          >
            Send reply
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 4 }}>
          <Section title="Note">
            <textarea
              value={sel.note}
              onChange={(e) => onPatch(sel.id, { note: e.target.value })}
              placeholder="e.g. this should sit centered under the header, and match the card radius"
              style={textareaStyle}
            />
            <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 4 }}>
              <select
                value={sel.model}
                onChange={(e) => onPatch(sel.id, { model: e.target.value })}
                style={selectStyle}
                title="Which model handles this note"
              >
                {MODEL_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                value={sel.effort}
                onChange={(e) => onPatch(sel.id, { effort: e.target.value })}
                style={selectStyle}
                title="Requested reasoning effort (a hint, not a hard limit)"
              >
                {EFFORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => onSend(sel.id)}
                disabled={!sel.note.trim()}
                style={{ ...sendButtonStyle, opacity: sel.note.trim() ? 1 : 0.4 }}
              >
                Send note
              </button>
            </div>
          </Section>

          <Section title="Padding">
            <Row
              label="Top"
              defaultValue={cv.paddingTop}
              onNumber={(v) => stage("padding-top", v == null ? null : `pt-[${v}px]`, v == null ? "" : `${v}px`)}
            />
            <Row
              label="Right"
              defaultValue={cv.paddingRight}
              onNumber={(v) => stage("padding-right", v == null ? null : `pr-[${v}px]`, v == null ? "" : `${v}px`)}
            />
            <Row
              label="Bottom"
              defaultValue={cv.paddingBottom}
              onNumber={(v) => stage("padding-bottom", v == null ? null : `pb-[${v}px]`, v == null ? "" : `${v}px`)}
            />
            <Row
              label="Left"
              defaultValue={cv.paddingLeft}
              onNumber={(v) => stage("padding-left", v == null ? null : `pl-[${v}px]`, v == null ? "" : `${v}px`)}
            />
            <Row
              label="All"
              onNumber={(v) => stage("padding", v == null ? null : `p-[${v}px]`, v == null ? "" : `${v}px`)}
            />
          </Section>

          <Section title="Margin">
            <Row
              label="Top"
              defaultValue={cv.marginTop}
              onNumber={(v) => stage("margin-top", v == null ? null : `mt-[${v}px]`, v == null ? "" : `${v}px`)}
            />
            <Row
              label="Right"
              defaultValue={cv.marginRight}
              onNumber={(v) => stage("margin-right", v == null ? null : `mr-[${v}px]`, v == null ? "" : `${v}px`)}
            />
            <Row
              label="Bottom"
              defaultValue={cv.marginBottom}
              onNumber={(v) => stage("margin-bottom", v == null ? null : `mb-[${v}px]`, v == null ? "" : `${v}px`)}
            />
            <Row
              label="Left"
              defaultValue={cv.marginLeft}
              onNumber={(v) => stage("margin-left", v == null ? null : `ml-[${v}px]`, v == null ? "" : `${v}px`)}
            />
            <Row
              label="All"
              onNumber={(v) => stage("margin", v == null ? null : `m-[${v}px]`, v == null ? "" : `${v}px`)}
            />
          </Section>

          <Section title="Gap">
            <Row
              label="Gap X"
              defaultValue={cv.columnGap}
              onNumber={(v) => stage("gap-x", v == null ? null : `gap-x-[${v}px]`, v == null ? "" : `${v}px`)}
            />
            <Row
              label="Gap Y"
              defaultValue={cv.rowGap}
              onNumber={(v) => stage("gap-y", v == null ? null : `gap-y-[${v}px]`, v == null ? "" : `${v}px`)}
            />
          </Section>

          <Section title="Background color">
            <input
              type="color"
              defaultValue={cv.backgroundColor}
              style={colorInputStyle}
              onChange={(e) => stage("background-color", `bg-[${e.target.value}]`, e.target.value)}
            />
            <PresetRow presets={THEME_COLORS} onPick={(p) => stage("background-color", `bg-${p}`, `var(--${p})`)} />
          </Section>

          <Section title="Text color">
            <input
              type="color"
              defaultValue={cv.color}
              style={colorInputStyle}
              onChange={(e) => stage("text-color", `text-[${e.target.value}]`, e.target.value)}
            />
            <PresetRow presets={THEME_COLORS} onPick={(p) => stage("text-color", `text-${p}`, `var(--${p})`)} />
          </Section>

          <Section title="Border">
            <Row
              label="Width"
              defaultValue={cv.borderWidth}
              onNumber={(v) => stage("border-width", v == null ? null : `border-[${v}px]`, v == null ? "" : `${v}px`)}
            />
            <input
              type="color"
              defaultValue={cv.borderColor}
              style={colorInputStyle}
              onChange={(e) => stage("border-color", `border-[${e.target.value}]`, e.target.value)}
            />
            <PresetRow presets={THEME_COLORS} onPick={(p) => stage("border-color", `border-${p}`, `var(--${p})`)} />
          </Section>

          <Section title="Border radius">
            <Row
              label="Radius"
              defaultValue={cv.borderRadius}
              onNumber={(v) =>
                stage("border-radius", v == null ? null : `rounded-[${v}px]`, v == null ? "" : `${v}px`)
              }
            />
            <PresetRow
              presets={RADIUS_PRESETS}
              onPick={(p) => stage("border-radius", p === "none" ? "rounded-none" : `rounded-${p}`, RADIUS_CSS[p])}
            />
          </Section>

          <Section title="Font size">
            <Row
              label="Size"
              defaultValue={cv.fontSize}
              onNumber={(v) => stage("font-size", v == null ? null : `text-[${v}px]`, v == null ? "" : `${v}px`)}
            />
            <PresetRow presets={SIZE_PRESETS} onPick={(p) => stage("font-size", `text-${p}`, SIZE_CSS[p])} />
          </Section>

          <Section title="Font weight">
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Currently {cv.fontWeight || "—"}</div>
            <PresetRow presets={WEIGHT_PRESETS} onPick={(p) => stage("font-weight", `font-${p}`, WEIGHT_CSS[p])} />
          </Section>

          <Section title="Font family">
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Currently {cv.fontFamily || "—"}</div>
            <PresetRow presets={FAMILY_PRESETS} onPick={(p) => stage("font-family", `font-${p}`, FAMILY_CSS[p])} />
          </Section>

          <Section title="Text align">
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Currently {cv.textAlign || "—"}</div>
            <PresetRow presets={ALIGN_PRESETS} onPick={(p) => stage("text-align", `text-${p}`, p)} />
          </Section>

          <Section title="Shadow">
            <div
              style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis" }}
              title={cv.boxShadow}
            >
              Currently {cv.boxShadow || "—"}
            </div>
            <PresetRow presets={SHADOW_PRESETS} onPick={(p) => stage("box-shadow", SHADOW_TOKEN[p], SHADOW_CSS[p])} />
          </Section>

          <Section title="Size">
            <Row
              label="Width"
              defaultValue={cv.width}
              onNumber={(v) => stage("width", v == null ? null : `w-[${v}px]`, v == null ? "" : `${v}px`)}
            />
            <Row
              label="Height"
              defaultValue={cv.height}
              onNumber={(v) => stage("height", v == null ? null : `h-[${v}px]`, v == null ? "" : `${v}px`)}
            />
          </Section>
        </div>
      )}

      <div onPointerDown={startResize} style={resizeHandleStyle} title="Drag to resize" />
    </div>
  )
}

export default function StyleInspector() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  const [browse, setBrowse] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [linkedModel, setLinkedModel] = useState("auto")
  const [linkedEffort, setLinkedEffort] = useState("auto")
  const [hoverEl, setHoverEl] = useState<Element | null>(null)
  const [selections, setSelections] = useState<Selection[]>([])
  const [threads, setThreads] = useState<Record<string, NoteThread>>({})
  const [toast, setToast] = useState("")
  const [, forceTick] = useState(0)

  const elementsRef = useRef(new Map<string, HTMLElement>())
  const browseRef = useRef(browse)
  const passthroughRef = useRef(false)
  const colorSeed = useRef(0)
  browseRef.current = browse

  const patch = useCallback((id: string, p: Partial<Selection>) => {
    setSelections((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)))
  }, [])

  const raise = useCallback((id: string) => {
    setSelections((prev) => {
      const max = prev.reduce((n, s) => Math.max(n, s.z), 0)
      const target = prev.find((s) => s.id === id)
      if (!target || target.z === max) return prev
      return prev.map((s) => (s.id === id ? { ...s, z: max + 1 } : s))
    })
  }, [])

  // Restore selections across full reloads; elements are re-found by data-devloc.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as { active: boolean; selections: Selection[] }
      if (saved.selections?.length) {
        colorSeed.current = saved.selections.length
        // Defaults for fields added after a session was already stored, so an old saved shape
        // doesn't leave a select bound to `undefined`.
        setSelections(
          saved.selections.map((s) => ({
            ...s,
            attached: false,
            model: s.model ?? "auto",
            effort: s.effort ?? "auto",
          })),
        )
      }
      if (saved.active) setActive(true)
    } catch {
      /* nothing stored, or unreadable — start fresh */
    }
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ active, selections }))
    } catch {
      /* storage unavailable — selections just won't survive a reload */
    }
  }, [active, selections])

  const refreshThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/dev-notes")
      if (!res.ok) return
      const data = (await res.json()) as { threads: NoteThread[] }
      setThreads(Object.fromEntries((data.threads ?? []).map((t) => [t.id, t])))
    } catch {
      /* dev server restarting — next tick will pick it up */
    }
  }, [])

  const reattach = useCallback(() => {
    setSelections((prev) => {
      let changed = false
      const next = prev.map((sel) => {
        const current = elementsRef.current.get(sel.id)
        if (current && document.contains(current)) {
          if (sel.attached) return sel
          changed = true
          return { ...sel, attached: true }
        }
        const found = queryByLoc(sel.source)
        if (found) {
          elementsRef.current.set(sel.id, found)
          applyPending(found, sel.pending)
          changed = true
          return { ...sel, attached: true }
        }
        if (!sel.attached) return sel
        changed = true
        return { ...sel, attached: false }
      })
      return changed ? next : prev
    })
  }, [])

  // Navigating swaps the whole page out, so re-find elements immediately rather than waiting for
  // the poll — that lag was what made panels look broken after a round trip between pages.
  useEffect(() => {
    if (!active) return
    const timer = setTimeout(reattach, 60)
    return () => clearTimeout(timer)
  }, [active, pathname, reattach])

  // Re-attaching is pure DOM work, so it can run often. Polling for replies is a network round
  // trip, so it only runs when there is actually a thread to hear back on — otherwise a long
  // styling session quietly fired thousands of requests at the dev server for nothing, which is
  // real memory pressure on a project this size.
  const hasThread = selections.some((s) => s.threadId !== null)

  useEffect(() => {
    if (!active) return
    const id = setInterval(reattach, 2000)
    return () => clearInterval(id)
  }, [active, reattach])

  useEffect(() => {
    if (!active || !hasThread) return
    void refreshThreads()
    const id = setInterval(() => void refreshThreads(), 4000)
    return () => clearInterval(id)
  }, [active, hasThread, refreshThreads])

  // Highlight boxes are viewport-positioned, so they need a nudge to follow scrolling.
  useEffect(() => {
    if (!active) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => forceTick((n) => n + 1))
    }
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", onScroll)
    }
  }, [active])

  const isInsideUi = (el: Element | null) => !!el?.closest("[data-style-inspector-ui]")

  // Every click just adds a selection — it used to clear the board unless you held shift, but
  // that meant losing everything from one careless click, and shift+click repeated rapidly is
  // exactly the pattern Windows' Sticky Keys prompt watches for. Close/Close-all are the only way
  // to clear now.
  const addSelection = useCallback((host: HTMLElement) => {
    const source = parseLoc(host.getAttribute("data-devloc") ?? "")
    if (!source) return
    const key = locKey(source)

    setSelections((prev) => {
      const existing = prev.find((s) => locKey(s.source) === key)
      if (existing) {
        elementsRef.current.set(existing.id, host)
        const max = prev.reduce((n, s) => Math.max(n, s.z), 0)
        return prev.map((s) =>
          s.id === existing.id ? { ...s, attached: true, minimized: false, z: max + 1 } : s,
        )
      }

      const id = `${key}#${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
      elementsRef.current.set(id, host)
      const offset = prev.length % 8
      const width = 300
      const maxZ = prev.reduce((n, s) => Math.max(n, s.z), 0)
      const sel: Selection = {
        id,
        source,
        tag: host.tagName.toLowerCase(),
        page: window.location.pathname,
        color: PALETTE[colorSeed.current++ % PALETTE.length],
        z: maxZ + 1,
        attached: true,
        pending: {},
        currentValues: readCurrentValues(host),
        note: "",
        linked: false,
        model: "auto",
        effort: "auto",
        threadId: null,
        pos: {
          x: Math.max(12, window.innerWidth - width - 20 - offset * 26),
          y: Math.min(window.innerHeight - 220, 76 + offset * 26),
        },
        size: { width, height: 460 },
        minimized: false,
        showThread: false,
        status: "",
        lastSeenReplyAt: null,
      }
      return [...prev, sel]
    })
  }, [])

  useEffect(() => {
    if (!active) return

    const onMove = (e: MouseEvent) => {
      if (browseRef.current) return
      const target = e.target as Element | null
      const next = isInsideUi(target) ? null : target
      setHoverEl((prev) => (prev === next ? prev : next))
    }

    const onClick = (e: MouseEvent) => {
      if (passthroughRef.current) return
      const target = e.target as Element | null
      if (!target || isInsideUi(target)) return
      if (browseRef.current) return

      // Ctrl/Cmd-click hands this one click back to the app. preventDefault first, otherwise the
      // browser treats it as "open in new tab"; the re-dispatched plain click is what the app's
      // own handlers (next/link included) actually act on.
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        passthroughRef.current = true
        target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }))
        passthroughRef.current = false
        return
      }

      e.preventDefault()
      e.stopPropagation()
      const host = target.closest("[data-devloc]") as HTMLElement | null
      if (!host) {
        setToast("No source info on that element — try a parent, or it may live in components/ui.")
        setTimeout(() => setToast(""), 3000)
        return
      }
      addSelection(host)
    }

    document.addEventListener("mousemove", onMove, true)
    document.addEventListener("click", onClick, true)
    return () => {
      document.removeEventListener("mousemove", onMove, true)
      document.removeEventListener("click", onClick, true)
    }
  }, [active, addSelection])

  const stage = useCallback((id: string, category: StyleCategory, token: string | null, css: string) => {
    const el = elementsRef.current.get(id)
    if (el && document.contains(el)) writeStyle(el, category, css)
    setSelections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, pending: { ...s.pending, [category]: { token, css } } } : s)),
    )
  }, [])

  const saveOne = useCallback(
    async (sel: Selection) => {
      const entries = Object.entries(sel.pending) as [StyleCategory, PendingValue][]
      if (entries.length === 0) return
      patch(sel.id, { status: "Saving…" })
      try {
        // Sequential on purpose: each edit re-reads the file, so parallel writes to one file would
        // clobber each other.
        for (const [category, value] of entries) {
          await pushEdit(sel.source, category, value.token)
        }
        patch(sel.id, { status: "Saved to source", pending: {} })
        setTimeout(() => patch(sel.id, { status: "" }), 2500)
      } catch (err) {
        patch(sel.id, { status: `Error: ${(err as Error).message}` })
      }
    },
    [patch],
  )

  const selectionsRef = useRef(selections)
  selectionsRef.current = selections

  const handleSave = useCallback(
    (id: string) => {
      const sel = selectionsRef.current.find((s) => s.id === id)
      if (sel) void saveOne(sel)
    },
    [saveOne],
  )

  const handleSaveAll = useCallback(async () => {
    for (const sel of selectionsRef.current) {
      if (Object.keys(sel.pending).length > 0) await saveOne(sel)
    }
  }, [saveOne])

  const sendNote = useCallback(
    async (sels: Selection[], text: string, model: string, effort: string, threadId?: string | null) => {
      const elements = sels.map((s) => ({
        file: s.source.fileName,
        line: s.source.lineNumber,
        column: s.source.columnNumber,
        tag: s.tag,
        page: s.page,
        changes: describeChanges(s),
      }))
      const res = await fetch("/api/dev-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", elements, text, model, effort, threadId: threadId ?? undefined }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "send failed")
      return data.threadId as string
    },
    [],
  )

  const handleSend = useCallback(
    async (id: string) => {
      const sel = selectionsRef.current.find((s) => s.id === id)
      if (!sel?.note.trim()) return
      patch(id, { status: "Sending…" })
      try {
        const threadId = await sendNote([sel], sel.note, sel.model, sel.effort, sel.threadId)
        patch(id, { threadId, note: "", status: "Sent to Claude" })
        void refreshThreads()
        setTimeout(() => patch(id, { status: "" }), 2500)
      } catch (err) {
        patch(id, { status: `Error: ${(err as Error).message}` })
      }
    },
    [patch, sendNote, refreshThreads],
  )

  const handleSendLinked = useCallback(
    async (model: string, effort: string) => {
      // Every linked panel rides along even if only some of them carry note text — you might
      // link three elements and only need to describe the change on one of them.
      const linked = selectionsRef.current.filter((s) => s.linked)
      if (linked.length === 0 || !linked.some((s) => s.note.trim())) return
      const text = linked
        .map((s) => {
          const label = `<${s.tag}> ${s.source.fileName}:${s.source.lineNumber}`
          return s.note.trim() ? `• ${label} — ${s.note.trim()}` : `• ${label}`
        })
        .join("\n")
      try {
        const threadId = await sendNote(linked, text, model, effort)
        setSelections((prev) =>
          prev.map((s) =>
            linked.some((l) => l.id === s.id) ? { ...s, threadId, note: "", status: "Sent (linked)" } : s,
          ),
        )
        void refreshThreads()
      } catch (err) {
        setToast(`Error sending: ${(err as Error).message}`)
        setTimeout(() => setToast(""), 4000)
      }
    },
    [sendNote, refreshThreads],
  )

  const handleReply = useCallback(
    async (id: string, text: string) => {
      const sel = selectionsRef.current.find((s) => s.id === id)
      if (!sel) return
      try {
        await sendNote([sel], text, sel.model, sel.effort, sel.threadId)
        void refreshThreads()
      } catch (err) {
        patch(id, { status: `Error: ${(err as Error).message}` })
      }
    },
    [sendNote, refreshThreads, patch],
  )

  const handleClose = useCallback((id: string) => {
    setSelections((prev) => {
      const sel = prev.find((s) => s.id === id)
      if (sel) {
        const el = elementsRef.current.get(id)
        if (el) revertPending(el, sel.pending)
        elementsRef.current.delete(id)
      }
      return prev.filter((s) => s.id !== id)
    })
  }, [])

  /**
   * Remove the selected element from the source that produced it. The route decides whether it is
   * safe to do at all — an element that is a map's template or a condition's branch is refused
   * with a reason, which lands in the panel's status line.
   */
  const handleDelete = useCallback(
    async (id: string) => {
      const sel = selectionsRef.current.find((s) => s.id === id)
      if (!sel) return
      const what = `<${sel.tag}> in ${sel.source.fileName.split("/").pop()}:${sel.source.lineNumber}`
      if (!window.confirm(`Delete ${what} from the source?\n\nThis rewrites the file. It cannot be undone from here.`)) {
        return
      }

      patch(id, { status: "Deleting…" })
      try {
        const res = await fetch("/api/dev-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file: sel.source.fileName,
            line: sel.source.lineNumber,
            column: sel.source.columnNumber,
          }),
        })
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error || "delete failed")
        // The element is gone, so its panel has nothing left to point at.
        handleClose(id)
      } catch (err) {
        patch(id, { status: `Error: ${(err as Error).message}` })
      }
    },
    [patch, handleClose],
  )

  const closeAll = useCallback(() => {
    const count = selectionsRef.current.length
    if (count === 0) return
    if (!window.confirm(`Close all ${count} panel${count === 1 ? "" : "s"}? Unsaved preview changes will revert.`)) {
      return
    }
    setSelections((prev) => {
      for (const sel of prev) {
        const el = elementsRef.current.get(sel.id)
        if (el) revertPending(el, sel.pending)
        elementsRef.current.delete(sel.id)
      }
      return []
    })
  }, [])

  // shift+D toggles design mode, shift+S saves everything — skipped while typing so a note can
  // contain capital letters.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return
      const key = e.key.toLowerCase()
      if (key === "d") {
        e.preventDefault()
        setActive((a) => !a)
        setBrowse(false)
      } else if (key === "s" && active) {
        e.preventDefault()
        void handleSaveAll()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [active, handleSaveAll])

  const onPage = useMemo(() => selections.filter((s) => s.page === pathname), [selections, pathname])
  const offPage = useMemo(() => selections.filter((s) => s.page !== pathname), [selections, pathname])
  const offPageSummary = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of offPage) counts.set(s.page, (counts.get(s.page) ?? 0) + 1)
    return [...counts.entries()].map(([page, n]) => `${page} (${n})`).join(", ")
  }, [offPage])

  const zOrder = useMemo(() => [...selections].sort((a, b) => a.z - b.z).map((s) => s.id), [selections])

  // Numbered by overall pick order, not position within the current page's filtered list — so a
  // panel's number stays the same no matter which page you're looking at it from.
  const globalIndex = useMemo(() => {
    const map = new Map<string, number>()
    selections.forEach((s, i) => map.set(s.id, i))
    return map
  }, [selections])

  const pendingTotal = selections.reduce((n, s) => n + Object.keys(s.pending).length, 0)
  const linkedSelections = selections.filter((s) => s.linked)
  const linkedCount = linkedSelections.length
  const linkedHasText = linkedSelections.some((s) => s.note.trim())
  const allLinked = selections.length > 0 && selections.every((s) => s.linked)
  const hoverRect = !browse && hoverEl && !isInsideUi(hoverEl) ? hoverEl.getBoundingClientRect() : null

  return (
    <>
      {active && (
        // Live style edits reflow the page; without this, Chrome's default scroll anchoring
        // fights the resulting layout shifts and the page visibly jumps around while you type.
        <style>{`html, body { overflow-anchor: none; }`}</style>
      )}

      {active &&
        onPage.map((sel) => {
          const el = elementsRef.current.get(sel.id)
          if (!el || !sel.attached || !document.contains(el)) return null
          const r = el.getBoundingClientRect()
          return (
            <div
              key={`hl-${sel.id}`}
              style={{
                position: "fixed",
                left: r.left,
                top: r.top,
                width: r.width,
                height: r.height,
                outline: `2px solid ${sel.color}`,
                background: `${sel.color}14`,
                pointerEvents: "none",
                zIndex: 999997,
              }}
            >
              <span style={{ ...outlineTagStyle, background: sel.color }}>{(globalIndex.get(sel.id) ?? 0) + 1}</span>
            </div>
          )
        })}

      {active && hoverRect && (
        <div
          style={{
            position: "fixed",
            left: hoverRect.left,
            top: hoverRect.top,
            width: hoverRect.width,
            height: hoverRect.height,
            outline: "1px dashed #2563eb",
            background: "rgba(37, 99, 235, 0.06)",
            pointerEvents: "none",
            zIndex: 999998,
          }}
        />
      )}

      {active &&
        onPage.map((sel) => (
          <Panel
            key={sel.id}
            sel={sel}
            index={globalIndex.get(sel.id) ?? 0}
            zIndex={999000 + zOrder.indexOf(sel.id)}
            thread={sel.threadId ? threads[sel.threadId] : undefined}
            onStage={stage}
            onSave={handleSave}
            onDelete={handleDelete}
            onSend={handleSend}
            onReply={handleReply}
            onClose={handleClose}
            onPatch={patch}
            onRaise={raise}
          />
        ))}

      <div data-style-inspector-ui style={toolbarStyle}>
        {active && (
          <>
            {toast && <div style={toastStyle}>{toast}</div>}

            {offPage.length > 0 && (
              <div style={warningStyle}>
                ⚠ {offPage.length} selection{offPage.length === 1 ? "" : "s"} on other pages: {offPageSummary} — still
                saved/sent by the buttons below
              </div>
            )}

            {showHelp && (
              <div style={helpStyle}>
                <div>
                  <b>click</b> select element / add another
                </div>
                <div>
                  <b>ctrl/⌘+click</b> use the app normally
                </div>
                <div>
                  <b>shift+D</b> toggle design mode
                </div>
                <div>
                  <b>shift+S</b> save all
                </div>
                <div>
                  <b>Browse</b> navigate freely, nothing selects
                </div>
                <div>
                  <b>–</b> minimize a panel to its dot
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowHelp((h) => !h)}
                style={{ ...toolbarButtonStyle, background: "#111827" }}
                title="Shortcuts and how to use design mode"
              >
                {showHelp ? "hide help" : "? help"}
              </button>
              <button
                onClick={() => setBrowse((b) => !b)}
                style={{ ...toolbarButtonStyle, background: browse ? "#2563eb" : "#374151" }}
                title="Stop intercepting clicks so you can navigate the app freely"
              >
                {browse ? "Browsing" : "Browse"}
              </button>
              <button
                onClick={handleSaveAll}
                disabled={pendingTotal === 0}
                style={{ ...toolbarButtonStyle, background: "#16a34a", opacity: pendingTotal === 0 ? 0.4 : 1 }}
              >
                Save all{pendingTotal > 0 ? ` (${pendingTotal})` : ""}
              </button>
              {linkedCount > 0 && (
                <>
                  <select
                    value={linkedModel}
                    onChange={(e) => setLinkedModel(e.target.value)}
                    style={selectStyle}
                    title="Which model handles the linked notes"
                  >
                    {MODEL_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={linkedEffort}
                    onChange={(e) => setLinkedEffort(e.target.value)}
                    style={selectStyle}
                    title="Requested reasoning effort for the linked notes (a hint, not a hard limit)"
                  >
                    {EFFORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <button
                onClick={() => handleSendLinked(linkedModel, linkedEffort)}
                disabled={linkedCount === 0 || !linkedHasText}
                title={linkedCount > 0 && !linkedHasText ? "Write a note on at least one linked panel first" : ""}
                style={{
                  ...toolbarButtonStyle,
                  background: "#7c3aed",
                  opacity: linkedCount === 0 || !linkedHasText ? 0.4 : 1,
                }}
              >
                Send linked{linkedCount > 0 ? ` (${linkedCount})` : ""}
              </button>
              {selections.length > 0 && (
                <>
                  <label style={linkAllStyle}>
                    <input
                      type="checkbox"
                      checked={allLinked}
                      onChange={(e) =>
                        setSelections((prev) => prev.map((s) => ({ ...s, linked: e.target.checked })))
                      }
                    />
                    link all
                  </label>
                  <button onClick={closeAll} style={{ ...toolbarButtonStyle, background: "#6b7280" }}>
                    Close {selections.length}
                  </button>
                </>
              )}
            </div>
          </>
        )}
        <button
          onClick={() => {
            setActive((a) => !a)
            setBrowse(false)
          }}
          style={{ ...toggleButtonStyle, background: active ? "#e11d48" : "#111827" }}
          title="shift+D"
        >
          {active ? "Exit Design Mode" : "Design Mode"}
        </button>
      </div>
    </>
  )
}

const toolbarStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 16,
  right: 16,
  zIndex: 1000000,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 6,
  fontFamily: "system-ui, sans-serif",
}

const toggleButtonStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  color: "white",
  fontSize: 13,
  border: "none",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
}

const toolbarButtonStyle: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 6,
  color: "white",
  fontSize: 11,
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
}

const linkAllStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  fontWeight: 700,
  color: "white",
  background: "#374151",
  padding: "4px 9px",
  borderRadius: 6,
  cursor: "pointer",
}

const helpStyle: React.CSSProperties = {
  fontSize: 11,
  lineHeight: 1.6,
  color: "white",
  background: "rgba(17,24,39,0.92)",
  padding: "7px 10px",
  borderRadius: 8,
  textAlign: "right",
  maxWidth: 260,
}

const warningStyle: React.CSSProperties = {
  fontSize: 10,
  color: "white",
  background: "#b45309",
  padding: "5px 9px",
  borderRadius: 6,
  maxWidth: 300,
  textAlign: "right",
}

const toastStyle: React.CSSProperties = {
  fontSize: 11,
  color: "white",
  background: "#b45309",
  padding: "5px 9px",
  borderRadius: 6,
  maxWidth: 280,
}

const panelStyle: React.CSSProperties = {
  position: "fixed",
  display: "flex",
  flexDirection: "column",
  background: "white",
  color: "#111827",
  border: "2px solid #e5e7eb",
  borderRadius: 10,
  padding: 10,
  fontFamily: "system-ui, sans-serif",
  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
}

const dotStyle: React.CSSProperties = {
  position: "fixed",
  width: 30,
  height: 30,
  borderRadius: 999,
  border: "2px solid white",
  color: "white",
  fontSize: 12,
  fontWeight: 800,
  fontFamily: "system-ui, sans-serif",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
}

const dotBadgeStyle: React.CSSProperties = {
  position: "absolute",
  top: -2,
  right: -2,
  width: 9,
  height: 9,
  borderRadius: 999,
  background: "#facc15",
  border: "1.5px solid white",
}

const swatchStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 999,
  color: "white",
  fontSize: 10,
  fontWeight: 800,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
}

const outlineTagStyle: React.CSSProperties = {
  position: "absolute",
  top: -9,
  left: -9,
  width: 18,
  height: 18,
  borderRadius: 999,
  color: "white",
  fontSize: 10,
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "system-ui, sans-serif",
}

const resizeHandleStyle: React.CSSProperties = {
  position: "absolute",
  right: 2,
  bottom: 2,
  width: 16,
  height: 16,
  cursor: "nwse-resize",
  background:
    "linear-gradient(135deg, transparent 0%, transparent 45%, #9ca3af 45%, #9ca3af 55%, transparent 55%, transparent 100%)",
}

const closeButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  fontSize: 18,
  lineHeight: 1,
  cursor: "pointer",
  color: "#6b7280",
  padding: "0 2px",
}

const iconButtonStyle: React.CSSProperties = {
  border: "none",
  background: "#e5e7eb",
  color: "#374151",
  fontSize: 10,
  fontWeight: 700,
  padding: "2px 6px",
  borderRadius: 5,
  cursor: "pointer",
}

const saveButtonStyle: React.CSSProperties = {
  border: "none",
  background: "#16a34a",
  color: "white",
  fontSize: 12,
  fontWeight: 700,
  padding: "5px 11px",
  borderRadius: 6,
}

const deleteButtonStyle: React.CSSProperties = {
  border: "1px solid #fca5a5",
  background: "#fef2f2",
  color: "#b91c1c",
  fontSize: 12,
  fontWeight: 700,
  padding: "4px 10px",
  borderRadius: 6,
  cursor: "pointer",
}

const sendButtonStyle: React.CSSProperties = {
  border: "none",
  background: "#7c3aed",
  color: "white",
  fontSize: 11,
  fontWeight: 700,
  padding: "5px 11px",
  borderRadius: 6,
  cursor: "pointer",
}

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 62,
  marginTop: 4,
  fontSize: 12,
  fontFamily: "inherit",
  padding: "5px 7px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  resize: "vertical",
  boxSizing: "border-box",
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 4,
}

const labelStyle: React.CSSProperties = { fontSize: 12, color: "#374151" }

const inputStyle: React.CSSProperties = {
  width: 70,
  fontSize: 12,
  padding: "3px 6px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
}

const colorInputStyle: React.CSSProperties = {
  width: 40,
  height: 24,
  padding: 0,
  border: "1px solid #d1d5db",
  borderRadius: 6,
  marginTop: 4,
}

const selectStyle: React.CSSProperties = {
  fontSize: 11,
  padding: "3px 5px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "white",
  color: "#111827",
}

const chipStyle: React.CSSProperties = {
  fontSize: 11,
  padding: "3px 8px",
  border: "1px solid #d1d5db",
  borderRadius: 999,
  background: "#f9fafb",
  cursor: "pointer",
}

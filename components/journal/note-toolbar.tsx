"use client"

/**
 * The small set of controls a note needs. Deliberately minimal — formatting is bold/italic,
 * headings, bullets and checklists, plus the four things you can attach. Anything more starts
 * to feel like a word processor, and anything that can't round-trip to markdown can't ship.
 */

import { useRef, useState } from "react"
import type { Editor } from "@tiptap/react"
import {
  Bold,
  CheckSquare,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  List,
  Mic,
  Quote,
  Square,
  Type,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { NOTE_FONTS } from "@/components/journal/note-editor"
import { cn } from "@/lib/utils"

export function NoteToolbar({
  editor,
  font,
  onFontChange,
  onPickImage,
  onRecordVoice,
  onPickMeditation,
  onPickQuote,
  isRecording,
  isBusy,
}: {
  editor: Editor | null
  font: string | null
  onFontChange: (font: string | null) => void
  onPickImage: (file: File) => void
  onRecordVoice: () => void
  onPickMeditation: () => void
  onPickQuote: () => void
  isRecording: boolean
  isBusy: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showFonts, setShowFonts] = useState(false)

  const iconButton = (
    key: string,
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    active?: boolean,
    disabled?: boolean,
  ) => (
    <button
      key={key}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-md p-2 text-gray-500 transition-colors hover:bg-muted hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40",
        active && "bg-muted text-gray-800",
      )}
    >
      {icon}
    </button>
  )

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-muted pb-2">
      {iconButton("bold", "Bold", <Bold className="h-4 w-4" />, () => editor?.chain().focus().toggleBold().run(), editor?.isActive("bold"), !editor)}
      {iconButton("italic", "Italic", <Italic className="h-4 w-4" />, () => editor?.chain().focus().toggleItalic().run(), editor?.isActive("italic"), !editor)}
      {iconButton("h1", "Heading", <Heading1 className="h-4 w-4" />, () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), editor?.isActive("heading", { level: 1 }), !editor)}
      {iconButton("h2", "Subheading", <Heading2 className="h-4 w-4" />, () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), editor?.isActive("heading", { level: 2 }), !editor)}
      {iconButton("bullet", "Bullet list", <List className="h-4 w-4" />, () => editor?.chain().focus().toggleBulletList().run(), editor?.isActive("bulletList"), !editor)}
      {iconButton("task", "Checklist", <CheckSquare className="h-4 w-4" />, () => editor?.chain().focus().toggleTaskList().run(), editor?.isActive("taskList"), !editor)}

      <span className="mx-1 h-5 w-px bg-muted" aria-hidden />

      {iconButton("image", "Add image", <ImagePlus className="h-4 w-4" />, () => fileInputRef.current?.click(), false, isBusy)}
      {iconButton(
        "voice",
        isRecording ? "Stop recording" : "Record voice note",
        isRecording ? <Square className="h-4 w-4 text-destructive" /> : <Mic className="h-4 w-4" />,
        onRecordVoice,
        isRecording,
        isBusy && !isRecording,
      )}
      {iconButton("meditation", "Reference a meditation", <span className="text-xs font-black">＋♪</span>, onPickMeditation, false, isBusy)}
      {iconButton("quote", "Quote another note", <Quote className="h-4 w-4" />, onPickQuote, false, isBusy)}

      <span className="mx-1 h-5 w-px bg-muted" aria-hidden />

      <div className="relative">
        {iconButton("font", "Typeface", <Type className="h-4 w-4" />, () => setShowFonts((open) => !open))}
        {showFonts && (
          <div className="absolute left-0 top-full z-30 mt-1 w-32 rounded-lg border-[3px] border-muted bg-white p-1 shadow-lg">
            {[{ id: null, label: "App default", className: "font-serif" }, ...NOTE_FONTS].map((option) => (
              <button
                key={option.id ?? "default"}
                type="button"
                onClick={() => {
                  onFontChange(option.id as string | null)
                  setShowFonts(false)
                }}
                className={cn(
                  "block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted",
                  option.className,
                  (font ?? null) === option.id ? "bg-muted font-black text-gray-800" : "text-gray-600",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isRecording && (
        <span className="ml-1 flex items-center gap-1.5 text-[11px] font-black text-destructive">
          <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
          Recording
        </span>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onPickImage(file)
          event.target.value = ""
        }}
      />
    </div>
  )
}

/** Small wrapper around MediaRecorder, matching how the Creator captures voice. */
export function useVoiceRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [isRecording, setIsRecording] = useState(false)

  const start = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4"
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.start()
      recorderRef.current = recorder
      setIsRecording(true)
      return true
    } catch (error) {
      console.error("[journal] Microphone unavailable:", error)
      return false
    }
  }

  const stop = async (): Promise<Blob | null> => {
    const recorder = recorderRef.current
    if (!recorder) return null

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType }))
      recorder.stop()
    })

    recorder.stream.getTracks().forEach((track) => track.stop())
    recorderRef.current = null
    setIsRecording(false)
    return blob
  }

  return { isRecording, start, stop }
}

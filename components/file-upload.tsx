"use client"

import type { ChangeEvent, DragEvent, Dispatch, SetStateAction, ReactNode, MutableRefObject } from "react"
import { motion } from "framer-motion"
import { Upload } from "lucide-react"

interface FileUploadProps {
  file: File | null
  setFile: Dispatch<SetStateAction<File | null>>
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  handleDragOver: (e: DragEvent) => void
  handleDragLeave: (e: DragEvent) => void
  handleDrop: (e: DragEvent) => void
  fileInputRef: MutableRefObject<HTMLInputElement | null>
  uploadAreaRef: MutableRefObject<HTMLDivElement | null>
  isMobileDevice: boolean
  children?: ReactNode
}

export function FileUpload({
  file,
  setFile,
  handleFileChange,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  fileInputRef,
  uploadAreaRef,
  isMobileDevice,
  children,
}: FileUploadProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      ref={uploadAreaRef}
      className="overflow-hidden border-none bg-white dark:bg-gray-900 rounded-2xl mb-8 cursor-pointer transition-all duration-300 shadow-none hover:shadow-lg dark:shadow-white/10 dark:hover:shadow-white/20"
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="bg-gradient-to-r from-logo-teal via-logo-emerald to-logo-blue py-3 px-6 dark:from-logo-teal dark:via-logo-emerald dark:to-logo-blue border-dashed border-0">
        <h3 className="text-white flex items-center font-black">
          <Upload className="h-4 w-4 mr-2" />
          Upload Audio
        </h3>
      </div>
      <div className="p-10 md:p-16 text-center md:py-14 border-dashed border-stone-300 border-2 rounded-b-2xl border-t-0">
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {children || (
            <>
              <div className="dark:text-gray-200 font-serif mb-2.5 font-black text-base text-gray-600">
                Drop your audio file here or click to browse
              </div>
              <div className="dark:text-gray-400/70 text-stone-400 font-serif text-xs">
                Supports MP3, WAV, OGG, and M4A files (Max: {isMobileDevice ? "50MB" : "500MB"})
              </div>
            </>
          )}
        </motion.div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".mp3,.wav,.ogg,.m4a,audio/*"
        onChange={handleFileChange}
      />
    </motion.div>
  )
}

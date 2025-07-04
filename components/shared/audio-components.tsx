"use client"

import type React from "react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface GradientCardProps {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  gradient: string
  children: React.ReactNode
  className?: string
}

export const GradientCard = ({ title, icon: Icon, gradient, children, className = "" }: GradientCardProps) => (
  <Card className={`overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900 ${className}`}>
    <div className={`bg-gradient-to-r ${gradient} py-3 px-6`}>
      <h3 className="text-white flex items-center font-black">
        {Icon && <Icon className="h-4 w-4 mr-2" />}
        {title}
      </h3>
    </div>
    {children}
  </Card>
)

interface ProgressCardProps {
  title: string
  progress: number
  step: string
  gradient: string
}

export const ProgressCard = ({ title, progress, step, gradient }: ProgressCardProps) => (
  <Card className={`p-6 bg-gradient-to-r ${gradient} border-logo-rose-200 shadow-sm dark:shadow-white/10`}>
    <div className="text-center mb-4">
      <h3 className="text-lg font-medium text-logo-rose-700 dark:text-logo-rose-300 mb-2">{title}</h3>
      <p className="text-sm text-logo-rose-600 dark:text-logo-rose-400">{step}</p>
    </div>
    <div className="w-full bg-logo-rose-200 rounded-full h-2 mb-2 dark:bg-logo-rose-800">
      <div
        className="bg-gradient-to-r from-logo-rose-500 to-logo-purple-500 h-2 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
    <div className="text-center text-sm text-logo-rose-600 dark:text-logo-rose-400">{progress}% complete</div>
  </Card>
)

interface ActionButtonProps {
  onClick: () => void
  disabled?: boolean
  gradient: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  loading?: boolean
}

export const ActionButton = ({
  onClick,
  disabled,
  gradient,
  icon: Icon,
  children,
  loading = false,
}: ActionButtonProps) => (
  <Button
    onClick={onClick}
    disabled={disabled || loading}
    className={cn(
      "w-full py-7 text-lg font-medium tracking-wider rounded-xl transition-all",
      "shadow-lg dark:shadow-white/20 hover:shadow-none active:shadow-none",
      `bg-gradient-to-r ${gradient} text-white`,
    )}
  >
    <div className="flex items-center justify-center font-black">
      {loading && (
        <div className="mr-3 h-5 w-5">
          <svg
            className="animate-spin h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}
      {Icon && <Icon className="mr-2 h-5 w-5" />}
      {children}
    </div>
  </Button>
)

interface AudioPlayerCardProps {
  title: string
  audioUrl: string
  gradient: string
  stats?: Array<{ label: string; value: string }>
  onDownload?: () => void
  downloadLabel?: string
}

export const AudioPlayerCard = ({
  title,
  audioUrl,
  gradient,
  stats,
  onDownload,
  downloadLabel,
}: AudioPlayerCardProps) => (
  <Card className={`overflow-hidden border-none shadow-xl dark:shadow-white/25 bg-gradient-to-br ${gradient}`}>
    <div className="bg-gradient-to-r from-logo-teal-600 to-logo-emerald-600 py-3 px-6 dark:from-logo-teal-700 dark:to-logo-emerald-700">
      <h3 className="text-white font-black">{title}</h3>
    </div>
    <div className="p-6">
      <div className="bg-white rounded-lg p-3 shadow-sm dark:shadow-white/10 mb-4 dark:bg-gray-700">
        <audio controls className="w-full" src={audioUrl} />
      </div>
      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white/60 p-3 rounded-lg text-center dark:bg-gray-800/60 shadow-lg">
              <div className="text-xs text-logo-teal-500 uppercase tracking-wide mb-1 dark:text-logo-teal-400">
                {stat.label}
              </div>
              <div className="dark:text-black font-black text-gray-600">{stat.value}</div>
            </div>
          ))}
        </div>
      )}
      {onDownload && (
        <Button
          onClick={onDownload}
          className="w-full py-4 rounded-xl shadow-md dark:shadow-white/20 bg-gradient-to-r from-logo-teal-600 to-logo-emerald-600 hover:from-logo-teal-700 hover:to-logo-emerald-700 transition-all border-none"
        >
          <div className="flex items-center justify-center font-black">{downloadLabel || "Download"}</div>
        </Button>
      )}
    </div>
  </Card>
)

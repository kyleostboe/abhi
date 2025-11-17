import { HardDrive } from 'lucide-react'

interface StorageBarProps {
  usedBytes: number
  quotaBytes?: number
  isAuthenticated: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export function StorageBar({ usedBytes, quotaBytes, isAuthenticated }: StorageBarProps) {
  // Default quota if browser doesn't provide one (5GB typical for IndexedDB)
  const effectiveQuota = quotaBytes || 5 * 1024 * 1024 * 1024
  const percentage = Math.min((usedBytes / effectiveQuota) * 100, 100)

  return (
    <div className="w-full border-t-[3px] border-muted bg-white/80 backdrop-blur-sm py-4 px-6 md:px-10">
      <div className="flex items-center gap-4">
        <HardDrive className="h-5 w-5 text-gray-600 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-600 font-serif">
            <span className="font-semibold">Local Storage</span>
            <span>
              {formatFileSize(usedBytes)} {quotaBytes && `/ ${formatFileSize(quotaBytes)}`}
            </span>
          </div>
          <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden border border-muted">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-logo-teal-500 to-logo-blue-400 transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 font-serif">
            Audio stored locally on this device
            {isAuthenticated ? ". Metadata syncs across your devices." : " and clears on browser refresh."}
          </p>
        </div>
      </div>
    </div>
  )
}

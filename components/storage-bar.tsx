import { HardDrive, Download, Upload } from 'lucide-react'
import { Button } from './ui/button'

interface StorageBarProps {
  usedBytes: number
  quotaBytes?: number
  isAuthenticated: boolean
  onExportBackup?: () => void
  onImportBackup?: () => void
  isBackupLoading?: boolean
  backupProgress?: { progress: number; message: string } | null
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export function StorageBar({ 
  usedBytes, 
  quotaBytes, 
  isAuthenticated,
  onExportBackup,
  onImportBackup,
  isBackupLoading,
  backupProgress
}: StorageBarProps) {
  // Fallback for the guest path, which has no fixed quota of its own (5GB is just a sane default)
  const effectiveQuota = quotaBytes || 5 * 1024 * 1024 * 1024
  const percentage = Math.min((usedBytes / effectiveQuota) * 100, 100)

  return (
    <div className="w-full border-muted bg-white/80 backdrop-blur-sm py-4 px-6 md:px-10 border-t-0">
      <div className="flex items-center gap-4">
        <HardDrive className="h-5 w-5 text-gray-600 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-600 font-serif">
            <span className="font-semibold">{isAuthenticated ? "Cloud Storage" : "Local Storage"}</span>
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
            {isAuthenticated
              ? "Audio stored securely in the cloud — play it back from any device you log into."
              : "Audio stored locally on this device and clears on browser refresh."}
          </p>
        </div>
      </div>
      
      {isAuthenticated && onExportBackup && onImportBackup && (
        <div className="mt-4 pt-4 border-t border-muted">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onExportBackup} 
                disabled={isBackupLoading}
                className="flex-1 sm:flex-none"
              >
                <Download className="h-4 w-4 mr-2" /> Export Backup
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onImportBackup}
                disabled={isBackupLoading}
                className="flex-1 sm:flex-none"
              >
                <Upload className="h-4 w-4 mr-2" /> Import Backup
              </Button>
            </div>
            {backupProgress && (
              <div className="text-xs text-muted-foreground text-center sm:text-left">
                {backupProgress.message} ({Math.round(backupProgress.progress)}%)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

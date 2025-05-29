"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Download, Trash2 } from "lucide-react"

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [deviceInfo, setDeviceInfo] = useState<any>({})

  useEffect(() => {
    // Load logs from sessionStorage
    const loadLogs = () => {
      const storedLogs = JSON.parse(sessionStorage.getItem("abhi-debug-logs") || "[]")
      setLogs(storedLogs)
    }

    // Load device info
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      memory: (navigator as any).deviceMemory || "unknown",
      cores: navigator.hardwareConcurrency || "unknown",
      connection: (navigator as any).connection?.effectiveType || "unknown",
      screenSize: `${window.screen.width}x${window.screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio,
      audioContextState: (window as any).audioContext?.state || "not initialized",
    }
    setDeviceInfo(info)

    loadLogs()

    // Refresh logs every second
    const interval = setInterval(loadLogs, 1000)
    return () => clearInterval(interval)
  }, [])

  const clearLogs = () => {
    sessionStorage.removeItem("abhi-debug-logs")
    setLogs([])
  }

  const exportLogs = () => {
    const debugData = {
      deviceInfo,
      logs,
      timestamp: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `abhi-debug-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Only show in development or if debug mode is enabled
  if (process.env.NODE_ENV === "production" && !window.location.search.includes("debug=true")) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Debug Panel</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={exportLogs} className="h-7 w-7 p-0">
                <Download className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={clearLogs} className="h-7 w-7 p-0">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsOpen(!isOpen)} className="h-7 w-7 p-0">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {isOpen && (
            <>
              <div className="text-xs space-y-1 mb-3 p-2 bg-gray-50 rounded">
                <div>
                  <strong>Browser:</strong> {deviceInfo.userAgent?.split(" ").slice(-2).join(" ")}
                </div>
                <div>
                  <strong>Screen:</strong> {deviceInfo.screenSize}
                </div>
                <div>
                  <strong>Memory:</strong> {deviceInfo.memory}GB
                </div>
                <div>
                  <strong>Connection:</strong> {deviceInfo.connection}
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto text-xs space-y-1">
                {logs
                  .slice(-20)
                  .reverse()
                  .map((log, i) => (
                    <div key={i} className="p-1 border-b border-gray-100">
                      <div className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</div>
                      <div className="font-mono">{log.message}</div>
                      {log.data && (
                        <div className="text-gray-600 text-xs">
                          {typeof log.data === "object" ? JSON.stringify(log.data) : log.data}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

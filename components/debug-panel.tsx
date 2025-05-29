"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface LogEntry {
  timestamp: string
  message: string
  type: "log" | "warn" | "error"
}

const DebugPanel: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [deviceInfo, setDeviceInfo] = useState<any>({})
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && typeof sessionStorage !== "undefined") {
      const showDebug = process.env.NODE_ENV !== "production" || window.location.search.includes("debug=true")
      setIsVisible(showDebug)

      if (showDebug) {
        const loadLogs = () => {
          const storedLogs = JSON.parse(sessionStorage.getItem("abhi-debug-logs") || "[]")
          setLogs(storedLogs)
        }

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

        const interval = setInterval(loadLogs, 1000)
        return () => clearInterval(interval)
      }
    }
  }, [])

  if (!isVisible) {
    return null
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "10px",
        fontFamily: "monospace",
        fontSize: "12px",
        zIndex: 1000,
      }}
    >
      <h3>Debug Panel</h3>
      <div>
        <h4>Device Info:</h4>
        <pre>{JSON.stringify(deviceInfo, null, 2)}</pre>
      </div>
      <div>
        <h4>Logs:</h4>
        <div
          style={{
            maxHeight: "200px",
            overflowY: "scroll",
            padding: "5px",
            border: "1px solid white",
          }}
        >
          {logs.map((log, index) => (
            <div
              key={index}
              style={{
                marginBottom: "5px",
                color: log.type === "error" ? "red" : log.type === "warn" ? "yellow" : "white",
              }}
            >
              <span style={{ color: "lightgrey" }}>{log.timestamp}:</span> {log.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DebugPanel

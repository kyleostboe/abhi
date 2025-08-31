"use client"
import React, { useState, useEffect, useRef } from "react"
const TIMER_DURATION = 59
const BORDER_WIDTH_RATIO_VERTICAL = 0.08 // reduced from 0.16
const BORDER_WIDTH_RATIO_HORIZONTAL = 0.04 // reduced from 0.07
const CARD_RADIUS = "4rem 3rem 2rem 1rem"
const ASPECT_W = 1.8 // reduced from 2.2
const BASE_UNIT = 100 // reduced from 140
const COLOR_RING_MULTIPLIER = 2.2

export const MeditationTimer = () => {
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(TIMER_DURATION)
  const [pressed, setPressed] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => setSeconds((s) => s - 1), 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, seconds])

  const getResponsiveSizes = () => {
    if (typeof window !== "undefined") {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const isMobile = vw < 768
      const padVw = vw - (isMobile ? Math.max(vw * 0.15, 30) : Math.max(vw * 0.08, 32))
      const padVh = vh - Math.max(vh * 0.08, 24)
      const isDesktop = vw / vh > 1.3

      const maxWidth = isMobile ? Math.min(padVw * 0.85, vw - 40) : padVw
      const base = Math.min(maxWidth / (ASPECT_W + 0.3), padVh / 0.8, isMobile ? BASE_UNIT * 1.2 : BASE_UNIT * 1.8)
      const cardHeight = base > 0 ? base : isMobile ? BASE_UNIT * 0.8 : BASE_UNIT
      const cardWidth = cardHeight * ASPECT_W
      const borderV = cardHeight * BORDER_WIDTH_RATIO_VERTICAL
      const borderH = isDesktop ? cardHeight * BORDER_WIDTH_RATIO_HORIZONTAL : borderV

      const fontSizeMultiplier = isMobile ? 0.35 : 0.55
      const fontSize = Math.max(cardHeight * fontSizeMultiplier, isMobile ? 20 : 32)

      const outerWidth = cardWidth + borderH * 2
      const outerHeight = cardHeight + borderV * 2

      if (isMobile && outerWidth > vw - 20) {
        const scale = (vw - 20) / outerWidth
        return {
          cardWidth: `${cardWidth * scale}px`,
          cardHeight: `${cardHeight * scale}px`,
          outerWidth: `${outerWidth * scale}px`,
          outerHeight: `${outerHeight * scale}px`,
          borderV: `${borderV * scale}px`,
          borderH: `${borderH * scale}px`,
          fontSize: `${fontSize * scale}px`,
          borderHNum: borderH * scale,
          borderVNum: borderV * scale,
        }
      }

      return {
        cardWidth: `${cardWidth}px`,
        cardHeight: `${cardHeight}px`,
        outerWidth: `${outerWidth}px`,
        outerHeight: `${outerHeight}px`,
        borderV: `${borderV}px`,
        borderH: `${borderH}px`,
        fontSize: `${fontSize}px`,
        borderHNum: borderH,
        borderVNum: borderV,
      }
    }
    const borderV = BASE_UNIT * BORDER_WIDTH_RATIO_VERTICAL
    return {
      cardWidth: `${BASE_UNIT * ASPECT_W}px`,
      cardHeight: `${BASE_UNIT}px`,
      outerWidth: `${BASE_UNIT * ASPECT_W + borderV * 2}px`,
      outerHeight: `${BASE_UNIT + borderV * 2}px`,
      borderV: `${borderV}px`,
      borderH: `${borderV}px`,
      fontSize: `${BASE_UNIT * 0.4}px`,
      borderHNum: borderV,
      borderVNum: borderV,
    }
  }

  const [sizes, setSizes] = React.useState(getResponsiveSizes())
  useEffect(() => {
    function refresh() {
      setSizes(getResponsiveSizes())
    }
    window.addEventListener("resize", refresh)
    refresh()
    return () => window.removeEventListener("resize", refresh)
  }, [])

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        background: "transparent",
        position: "relative",
        padding: "20px 16px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "relative",
          width: sizes.outerWidth,
          height: sizes.outerHeight,
          borderRadius: CARD_RADIUS,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "width 0.3s, height 0.3s",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: `calc(100% * ${COLOR_RING_MULTIPLIER})`,
            height: `calc(100% * ${COLOR_RING_MULTIPLIER})`,
            transform: "translate(-50%, -50%)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: "conic-gradient(#34D399, #FBBF24, #D8B4FE, #34D399)",
              animation: running ? "pinwheel-spin 2.3s linear infinite" : "none",
            }}
          ></div>
        </div>
        <div
          role="button"
          tabIndex={0}
          aria-label={running ? "Pause timer" : "Start timer"}
          onClick={() => setRunning((r) => !r)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setRunning((r) => !r)}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          style={{
            position: "absolute",
            left: sizes.borderH,
            top: sizes.borderV,
            width: sizes.cardWidth,
            height: sizes.cardHeight,
            background: "#fff",
            borderRadius: CARD_RADIUS,
            fontFamily: "'Roboto Serif', serif",
            fontWeight: 900,
            fontSize: sizes.fontSize,
            color: "#6B7280",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            userSelect: "none",
            cursor: "pointer",
            boxShadow: pressed ? "none" : "0 12px 48px 0 rgba(0,0,0,0.19)",
            outline: "none",
            zIndex: 2,
            transition:
              "box-shadow 0.18s cubic-bezier(.44,0,.56,1), width 0.3s, height 0.3s, font-size 0.3s, left 0.3s, top 0.3s",
          }}
        >
          {formatTime(seconds)}
        </div>
        <style>
          {`
            @keyframes pinwheel-spin {
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  )
}

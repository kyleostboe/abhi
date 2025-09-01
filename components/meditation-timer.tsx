"use client"
import React, { useState, useEffect, useRef } from "react"
const TIMER_DURATION = 10 * 60
const BORDER_WIDTH_RATIO_VERTICAL = 0.08 // reduced from 0.16
const BORDER_WIDTH_RATIO_HORIZONTAL = 0.04 // reduced from 0.07
const CARD_RADIUS = "4rem 3rem 2rem 1rem"
const ASPECT_W = 2.2 // widened to fit timer numbers
const BASE_UNIT = 100 // reduced from 140
const COLOR_RING_MULTIPLIER = 2.2

export const MeditationTimer = () => {
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(TIMER_DURATION)
  const [selectedSeconds, setSelectedSeconds] = useState(TIMER_DURATION)
  const [pressed, setPressed] = useState(false)
  const intervalRef = useRef(null)
  const hourRef = useRef<HTMLDivElement>(null)
  const minuteRef = useRef<HTMLDivElement>(null)
  const secondRef = useRef<HTMLDivElement>(null)
  const [selectedHour, setSelectedHour] = useState(0)
  const [selectedMinute, setSelectedMinute] = useState(10)
  const [selectedSecond, setSelectedSecond] = useState(0)

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

      const fontSizeMultiplier = isMobile ? 0.32 : 0.5
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
  const fontSizeNum = parseFloat(sizes.fontSize as string)
  useEffect(() => {
    function refresh() {
      setSizes(getResponsiveSizes())
    }
    window.addEventListener("resize", refresh)
    refresh()
    return () => window.removeEventListener("resize", refresh)
  }, [])

  const hourOptions = Array.from({ length: 13 }, (_, i) => i)
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i)
  const secondOptions = Array.from({ length: 60 }, (_, i) => i)

  const scrollToValue = (
    ref: React.RefObject<HTMLDivElement>,
    value: number
  ) => {
    if (!ref.current) return
    const child = ref.current.children[value] as HTMLElement
    if (child) {
      const top =
        child.offsetTop - ref.current.clientHeight / 2 + child.clientHeight / 2
      ref.current.scrollTo({ top, behavior: "smooth" })
    }
  }

  useEffect(() => {
    scrollToValue(hourRef, selectedHour)
    scrollToValue(minuteRef, selectedMinute)
    scrollToValue(secondRef, selectedSecond)
  }, [sizes])

  const handleHourScroll = () => {
    if (!hourRef.current || running) return
    const container = hourRef.current
    const center = container.scrollTop + container.clientHeight / 2
    const children = Array.from(container.children) as HTMLElement[]
    let closestIndex = 0
    let closestDistance = Infinity
    children.forEach((child, index) => {
      const childCenter = child.offsetTop + child.offsetHeight / 2
      const distance = Math.abs(center - childCenter)
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = index
      }
    })
    const h = hourOptions[closestIndex]
    if (h !== selectedHour) {
      setSelectedHour(h)
      const total = h * 3600 + selectedMinute * 60 + selectedSecond
      setSelectedSeconds(total)
      setSeconds(total)
    }
  }

  const handleMinuteScroll = () => {
    if (!minuteRef.current || running) return
    const container = minuteRef.current
    const center = container.scrollTop + container.clientHeight / 2
    const children = Array.from(container.children) as HTMLElement[]
    let closestIndex = 0
    let closestDistance = Infinity
    children.forEach((child, index) => {
      const childCenter = child.offsetTop + child.offsetHeight / 2
      const distance = Math.abs(center - childCenter)
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = index
      }
    })
    const m = minuteOptions[closestIndex]
    if (m !== selectedMinute) {
      setSelectedMinute(m)
      const total = selectedHour * 3600 + m * 60 + selectedSecond
      setSelectedSeconds(total)
      setSeconds(total)
    }
  }

  const handleSecondScroll = () => {
    if (!secondRef.current || running) return
    const container = secondRef.current
    const center = container.scrollTop + container.clientHeight / 2
    const children = Array.from(container.children) as HTMLElement[]
    let closestIndex = 0
    let closestDistance = Infinity
    children.forEach((child, index) => {
      const childCenter = child.offsetTop + child.offsetHeight / 2
      const distance = Math.abs(center - childCenter)
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = index
      }
    })
    const s = secondOptions[closestIndex]
    if (s !== selectedSecond) {
      setSelectedSecond(s)
      const total = selectedHour * 3600 + selectedMinute * 60 + s
      setSelectedSeconds(total)
      setSeconds(total)
    }
  }

  useEffect(() => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    setSelectedHour(h)
    setSelectedMinute(m)
    setSelectedSecond(s)
    scrollToValue(hourRef, h)
    scrollToValue(minuteRef, m)
    scrollToValue(secondRef, s)
  }, [seconds])

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        background: "transparent",
        position: "relative",
        padding: "0px 16px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
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
            onClick={() => seconds > 0 && setRunning((r) => !r)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && seconds > 0 && setRunning((r) => !r)}
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
              flexDirection: "column",
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
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                ref={hourRef}
                onScroll={handleHourScroll}
                className="hide-scrollbar"
                style={{
                  width: `${fontSizeNum * 1.2}px`,
                  height: `${fontSizeNum * 2}px`,
                  overflowY: "scroll",
                  scrollSnapType: "y mandatory",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  paddingTop: `${fontSizeNum * 0.5}px`,
                  paddingBottom: `${fontSizeNum * 0.5}px`,
                  pointerEvents: running ? "none" : "auto",
                }}
              >
                {hourOptions.map((h) => (
                  <div
                    key={h}
                    style={{
                      scrollSnapAlign: "center",
                      fontFamily: "'Roboto Serif', serif",
                      fontWeight: 900,
                      fontSize: `${selectedHour === h ? fontSizeNum : fontSizeNum * 0.6}px`,
                      color: selectedHour === h ? "#000" : "#9CA3AF",
                      textAlign: "center",
                      lineHeight: 1.2,
                    }}
                  >
                    {String(h).padStart(2, "0")}
                  </div>
                ))}
              </div>
              <div style={{ padding: "0 4px", fontSize: `${fontSizeNum * 0.8}px` }}>:</div>
              <div
                ref={minuteRef}
                onScroll={handleMinuteScroll}
                className="hide-scrollbar"
                style={{
                  width: `${fontSizeNum * 1.2}px`,
                  height: `${fontSizeNum * 2}px`,
                  overflowY: "scroll",
                  scrollSnapType: "y mandatory",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  paddingTop: `${fontSizeNum * 0.5}px`,
                  paddingBottom: `${fontSizeNum * 0.5}px`,
                  pointerEvents: running ? "none" : "auto",
                }}
              >
                {minuteOptions.map((m) => (
                  <div
                    key={m}
                    style={{
                      scrollSnapAlign: "center",
                      fontFamily: "'Roboto Serif', serif",
                      fontWeight: 900,
                      fontSize: `${selectedMinute === m ? fontSizeNum : fontSizeNum * 0.6}px`,
                      color: selectedMinute === m ? "#000" : "#9CA3AF",
                      textAlign: "center",
                      lineHeight: 1.2,
                    }}
                  >
                    {String(m).padStart(2, "0")}
                  </div>
                ))}
              </div>
              <div style={{ padding: "0 4px", fontSize: `${fontSizeNum * 0.8}px` }}>:</div>
              <div
                ref={secondRef}
                onScroll={handleSecondScroll}
                className="hide-scrollbar"
                style={{
                  width: `${fontSizeNum * 1.2}px`,
                  height: `${fontSizeNum * 2}px`,
                  overflowY: "scroll",
                  scrollSnapType: "y mandatory",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  paddingTop: `${fontSizeNum * 0.5}px`,
                  paddingBottom: `${fontSizeNum * 0.5}px`,
                  pointerEvents: running ? "none" : "auto",
                }}
              >
                {secondOptions.map((s) => (
                  <div
                    key={s}
                    style={{
                      scrollSnapAlign: "center",
                      fontFamily: "'Roboto Serif', serif",
                      fontWeight: 900,
                      fontSize: `${selectedSecond === s ? fontSizeNum : fontSizeNum * 0.6}px`,
                      color: selectedSecond === s ? "#000" : "#9CA3AF",
                      textAlign: "center",
                      lineHeight: 1.2,
                    }}
                  >
                    {String(s).padStart(2, "0")}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <style>
            {`
              @keyframes pinwheel-spin {
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
        <button className="font-serif font-black text-base text-logo-rose-300"
          style={{
            marginTop: "8px",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.color = "#4B5563"
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.color = "#6B7280"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#6B7280"
          }}
          onClick={(e) => {
            setRunning(false)
            setSeconds(selectedSeconds)
          }}
        >
          reset
        </button>
        <style>
          {`.hide-scrollbar::-webkit-scrollbar { display: none; }`}
        </style>
      </div>
    </div>
  )
}

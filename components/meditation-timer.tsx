"use client"
import { useRef, useState, useEffect } from "react"

const TIMER_DURATION = 10 * 60
const BORDER_WIDTH_RATIO_VERTICAL = 0.08
const BORDER_WIDTH_RATIO_HORIZONTAL = 0.04
const CARD_RADIUS = "4rem 3rem 2rem 1rem"
const ASPECT_W = 2.2
const BASE_UNIT = 100
const COLOR_RING_MULTIPLIER = 2.2
const PICKER_ITEM_HEIGHT = 34

function pad2(n) {
  return String(n).padStart(2, "0")
}

function PickerColumn({ value, setValue, min, max, pad = 2, enabled = true, running = false }) {
  const ref = useRef()
  const itemCount = max - min + 1
  const values = Array.from({ length: itemCount }, (_, i) => min + i)

  // FIX: jump instantly when running, smoothly when paused
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTo({
        top: (value - min) * PICKER_ITEM_HEIGHT,
        behavior: enabled ? (running ? "auto" : "smooth") : "auto",
      })
    }
  }, [value, enabled, min, running])

  useEffect(() => {
    if (!enabled && ref.current) {
      ref.current.scrollTo({
        top: (value - min) * PICKER_ITEM_HEIGHT,
        behavior: "auto",
      })
    }
  }, [enabled, value, min])

  useEffect(() => {
    if (!enabled) return
    const node = ref.current
    if (!node) return
    let tid
    const finish = () => {
      const idx = Math.round(node.scrollTop / PICKER_ITEM_HEIGHT)
      setValue(idx + min)
      node._userScrolling = false
    }
    const onScroll = () => {
      node._userScrolling = true
      clearTimeout(tid)
      tid = setTimeout(finish, 80)
    }
    node.addEventListener("scroll", onScroll)
    return () => {
      clearTimeout(tid)
      node.removeEventListener("scroll", onScroll)
    }
  }, [enabled, min, setValue])

  return (
    <div
      style={{
        width: 46,
        height: PICKER_ITEM_HEIGHT * 3,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        userSelect: enabled ? "auto" : "none",
      }}
    >
      <div
        ref={ref}
        style={{
          width: "100%",
          height: "100%",
          overflowY: enabled ? "scroll" : "hidden",
          scrollSnapType: enabled ? "y mandatory" : "none",
        }}
        tabIndex={0}
        className="hide-scrollbar"
      >
        <div style={{ height: PICKER_ITEM_HEIGHT }}></div>
        {values.map((v, idx) => {
          let visible = true
          if (running && v !== value) visible = false
          const style = {
            color: v === value ? "#222" : "#bbb",
            fontWeight: v === value ? 700 : 700,
            fontSize: v === value ? 26 : 16,
            textAlign: "center",
            height: PICKER_ITEM_HEIGHT,
            lineHeight: `${PICKER_ITEM_HEIGHT}px`,
            transition: "color 0.08s, font-size 0.08s",
            opacity: visible ? 1 : 0,
            pointerEvents: v === value && enabled ? "auto" : "none",
          }
          return (
            <div key={v} style={style} onClick={() => enabled && setValue(v)} aria-selected={v === value}>
              {pad2(v)}
            </div>
          )
        })}
        <div style={{ height: PICKER_ITEM_HEIGHT }}></div>
      </div>
      {!enabled && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            zIndex: 99,
            pointerEvents: "auto",
            background: "transparent",
          }}
        />
      )}
    </div>
  )
}

export function MeditationTimer() {
  // Responsive container sizing (unchanged)
  const getResponsiveSizes = () => {
    if (typeof window !== "undefined") {
      const vw = window.innerWidth,
        vh = window.innerHeight
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
      const fontSize = Math.max(cardHeight * (isMobile ? 0.24 : 0.34), isMobile ? 16 : 22)
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
      fontSize: `${BASE_UNIT * 0.32}px`,
      borderHNum: borderV,
      borderVNum: borderV,
    }
  }

  const [seconds, setSeconds] = useState(TIMER_DURATION)
  const [running, setRunning] = useState(false)
  const [sizes, setSizes] = useState(getResponsiveSizes())

  useEffect(() => {
    const refresh = () => setSizes(getResponsiveSizes())
    window.addEventListener("resize", refresh)
    refresh()
    return () => window.removeEventListener("resize", refresh)
  }, [])

  useEffect(() => {
    if (!running) return
    if (seconds <= 0) {
      setRunning(false)
      return
    }
    const int = setInterval(() => setSeconds((s) => s - 1), 1000)
    return () => clearInterval(int)
  }, [running, seconds])

  const hour = Math.floor(seconds / 3600)
  const minute = Math.floor((seconds % 3600) / 60)
  const second = seconds % 60

  const setHour = (h) => {
    !running && setSeconds(h * 3600 + minute * 60 + second)
  }
  const setMinute = (m) => {
    !running && setSeconds(hour * 3600 + m * 60 + second)
  }
  const setSecond = (s) => {
    !running && setSeconds(hour * 3600 + minute * 60 + s)
  }

  function reset() {
    setRunning(false)
    setSeconds(TIMER_DURATION)
  }

  const fmt = (n) => String(n).padStart(2, "0")

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
            background: "none",
          }}
        >
          {/* Colorful spinning border */}
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
          <div className="h-auto"
            role="button"
            tabIndex={0}
            aria-label={running ? "Pause timer" : "Start timer"}
            onClick={() => seconds > 0 && setRunning((r) => !r)}
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
              boxShadow: "0 12px 48px 0 rgba(0,0,0,0.16)",
              outline: "none",
              zIndex: 2,
              transition:
                "box-shadow 0.18s cubic-bezier(.44,0,.56,1), width 0.3s, height 0.3s, font-size 0.3s, left 0.3s, top 0.3s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <PickerColumn
                value={hour}
                setValue={setHour}
                min={0}
                max={12}
                pad={2}
                enabled={!running}
                running={running}
              />
              <div className="text-gray-600" style={{ fontSize: 22, margin: "0 2px" }}>
                :
              </div>
              <PickerColumn
                value={minute}
                setValue={setMinute}
                min={0}
                max={59}
                pad={2}
                enabled={!running}
                running={running}
              />
              <div className="text-gray-600" style={{ fontSize: 22, margin: "0 2px" }}>
                :
              </div>
              <PickerColumn
                value={second}
                setValue={setSecond}
                min={0}
                max={59}
                pad={2}
                enabled={!running}
                running={running}
              />
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
        <button
          style={{
            marginTop: "8px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#6B7280",
            fontFamily: "'Roboto Serif', serif",
            fontWeight: 700,
            fontSize: 16,
          }}
          onClick={reset}
        >
          reset
        </button>
        <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      </div>
    </div>
  )
}

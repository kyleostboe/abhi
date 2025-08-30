"use client";
import React, { useState, useEffect, useRef } from "react";
const TIMER_DURATION = 59;
const BORDER_WIDTH = 36; // px: thickness of the rainbow border
const CARD_RADIUS = "4rem 3rem 2rem 1rem";
// Set a fixed card width/height to keep numbers size fixed:
const CARD_WIDTH = "340px";
const CARD_HEIGHT = "160px";
const COLOR_RING_MULTIPLIER = 2.2; // Lower for less wasted border space

export const MeditationTimer = () => {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(TIMER_DURATION);
  const [pressed, setPressed] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => setSeconds((s) => s - 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, seconds]);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(
      s % 60
    ).padStart(2, "0")}`;

  // Responsive outer container for border window, adapts for aspect ratio
  const getResponsiveOuterSize = () => {
    // You can play with these ratios for your design preference!
    if (typeof window !== "undefined") {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Use wider rectangle on desktop, squarer on mobile
      if (vw / vh > 1.2) {
        // Desktop: add a bit more width
        return {
          width: `calc(${CARD_WIDTH} + ${BORDER_WIDTH * 2 * 1.2}px)`,
          height: `calc(${CARD_HEIGHT} + ${BORDER_WIDTH * 2}px)`,
        };
      } else {
        // Mobile: border gets squarer
        return {
          width: `calc(${CARD_WIDTH} + ${BORDER_WIDTH * 2}px)`,
          height: `calc(${CARD_HEIGHT} + ${BORDER_WIDTH * 2 * 1.1}px)`,
        };
      }
    }
    // fallback (SSR)
    return {
      width: `calc(${CARD_WIDTH} + ${BORDER_WIDTH * 2}px)`,
      height: `calc(${CARD_HEIGHT} + ${BORDER_WIDTH * 2}px)`,
    };
  };

  const [outerStyle, setOuterStyle] = React.useState(getResponsiveOuterSize());
  // Listen for window resize
  React.useEffect(() => {
    function refresh() {
      setOuterStyle(getResponsiveOuterSize());
    }
    window.addEventListener("resize", refresh);
    refresh();
    return () => window.removeEventListener("resize", refresh);
    // eslint-disable-next-line
  }, []);

  return (
    <div
      style={{
        minHeight: "100dvh",
        minWidth: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "transparent",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "relative",
          ...outerStyle,
          borderRadius: CARD_RADIUS,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "width 0.3s, height 0.3s",
        }}
      >
        {/* Spinner wrapper */}
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
              background:
                "conic-gradient(#34D399, #FBBF24, #D8B4FE, #34D399)",
              animation: running
                ? "pinwheel-spin 2.3s linear infinite"
                : "none",
            }}
          ></div>
        </div>
        {/* Timer Card */}
        <div
          role="button"
          tabIndex={0}
          aria-label={running ? "Pause timer" : "Start timer"}
          onClick={() => setRunning((r) => !r)}
          onKeyDown={e =>
            (e.key === "Enter" || e.key === " ") && setRunning((r) => !r)
          }
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          style={{
            position: "relative",
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            background: "#fff",
            borderRadius: CARD_RADIUS,
            fontFamily: "'Roboto Serif', serif",
            fontWeight: 900,
            fontSize: "5rem", // or set a px value for always the same size
            color: "#6B7280",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            userSelect: "none",
            cursor: "pointer",
            boxShadow: pressed
              ? "none"
              : "0 12px 48px 0 rgba(0,0,0,0.19)",
            outline: "none",
            zIndex: 2,
            transition: "box-shadow 0.18s cubic-bezier(.44,0,.56,1)",
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
  );
};


export { MeditationTimer };

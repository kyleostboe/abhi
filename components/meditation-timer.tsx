"use client";
import React, { useState, useEffect, useRef } from "react";
const TIMER_DURATION = 59;
const BORDER_WIDTH = 56; // px (thick for a nice visual)

export const MeditationTimer = () => {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(TIMER_DURATION);
  const [pressed, setPressed] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, seconds]);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Sizing
  const CARD_SIZE = "min(44vw, 34vh)";

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "transparent",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Border Ring & Timer Card */}
      <div
        style={{
          width: CARD_SIZE,
          height: CARD_SIZE,
          borderRadius: "4rem 3rem 2rem 1rem",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Spinning color ring, exactly matches border shape */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            borderRadius: "4rem 3rem 2rem 1rem",
            padding: 0,
            zIndex: 1,
            pointerEvents: "none",
            // Outer ring, then inner "cutout" with white center using box-shadow
            background: "conic-gradient(#FDA4AF, #34D399, #60A5FA, #FCD34D, #FDA4AF)",
            animation: running ? "pinwheel-spin 2.3s linear infinite" : "none",
            // This creates a color border, but overlays card's center with white in next element
            boxShadow: `0 0 0 ${BORDER_WIDTH/2}px #fff inset`,
            // The above overlays white inside, so only the border shows gradient
          }}
        />
        {/* Timer Card (content) */}
        <div
          role="button"
          tabIndex={0}
          aria-label={running ? "Pause timer" : "Start timer"}
          onClick={() => setRunning((r) => !r)}
          onKeyDown={e => (e.key === "Enter" || e.key === " ") && setRunning((r) => !r)}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          style={{
            position: "relative",
            zIndex: 2,
            width: "100%",
            height: "100%",
            borderRadius: "4rem 3rem 2rem 1rem",
            background: "transparent",
            fontFamily: "'Roboto Serif', serif",
            fontWeight: 900,
            fontSize: "clamp(2.4rem, 8vw, 6rem)",
            color: "#6B7280",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            userSelect: "none",
            cursor: "pointer",
            border: "none",
            boxShadow:
              running || pressed
                ? "none"
                : "0 8px 40px 0 rgba(0,0,0,0.13), 0 0 0 4px rgba(0,0,0,0.02)",
            outline: pressed ? "2px solid #34D399" : "none",
            backgroundClip: "padding-box",
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

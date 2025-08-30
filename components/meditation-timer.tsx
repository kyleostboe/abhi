"use client";
import React, { useState, useEffect, useRef } from "react";
const TIMER_DURATION = 59;
const BORDER_WIDTH = 24; // px

export const MeditationTimer = () => {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(TIMER_DURATION);
  const [pressed, setPressed] = useState(false);
  const intervalRef = useRef(null);

  // Timer logic
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

  // Format as mm:ss
  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Responsive sizing
  const CARD_SIZE = "min(54vw, 26vh)";
  const SPIN_SIZE = "250vw"; // MASSIVE, guarantees pure spectrum border always

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
      {/* Giant spinning color wheel MASKED to only show through timer border */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: CARD_SIZE,
          height: CARD_SIZE,
          pointerEvents: "none",
          zIndex: 1,
          transform: "translate(-50%, -50%)",
          // The spinning conic gradient
          background: `conic-gradient(#FDA4AF, #34D399, #60A5FA, #FCD34D, #FDA4AF)`,
          borderRadius: "4rem 3rem 2rem 1rem",
          animation: running ? "pinwheel-spin 2.3s linear infinite" : "none",
          // Mask so only a ring (the border) is shown
          WebkitMaskImage: `
            radial-gradient(circle, 
              transparent calc(50% - ${BORDER_WIDTH}px), 
              black calc(50% - ${BORDER_WIDTH}px), 
              black calc(50% + ${BORDER_WIDTH}px), 
              transparent calc(50% + ${BORDER_WIDTH}px)
            )
          `,
          maskImage: `
            radial-gradient(circle, 
              transparent calc(50% - ${BORDER_WIDTH}px), 
              black calc(50% - ${BORDER_WIDTH}px), 
              black calc(50% + ${BORDER_WIDTH}px), 
              transparent calc(50% + ${BORDER_WIDTH}px)
            )
          `
        }}
        aria-hidden="true"
      ></div>
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
          width: CARD_SIZE,
          height: CARD_SIZE,
          borderRadius: "4rem 3rem 2rem 1rem",
          background: "#fff",
          fontFamily: "'Roboto Serif', serif",
          fontWeight: 900,
          fontSize: "clamp(2.4rem, 10vw, 6rem)",
          color: "#6B7280",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          userSelect: "none",
          cursor: "pointer",
          transition: "box-shadow 0.15s cubic-bezier(.4,0,.2,1), outline 0.1s",
          border: `${BORDER_WIDTH}px solid transparent`,
          boxShadow:
            running || pressed
              ? "none"
              : "0 8px 40px 0 rgba(0,0,0,0.13), 0 0 0 4px rgba(0,0,0,0.02)",
          outline: pressed ? "2px solid #34D399" : "none",
        }}
      >
        {formatTime(seconds)}
      </div>
      {/* Spin keyframes */}
      <style>
        {`
          @keyframes pinwheel-spin {
            100% { transform: translate(-50%, -50%) rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};


export { MeditationTimer };

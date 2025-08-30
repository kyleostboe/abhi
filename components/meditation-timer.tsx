"use client";
import React, { useState, useEffect, useRef } from "react";

const TIMER_DURATION = 59;

export const MeditationTimer = () => {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(TIMER_DURATION);
  const [pressed, setPressed] = useState(false);
  const intervalRef = useRef(null);

  // Countdown logic
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

  // Constants for responsive sizing
  const BORDER_WIDTH = 18;    // border thickness in px
  const SIZE = "min(80vw, 38vh)"; // overall size of timer card
  const BG_SIZE = "400%"; // gradient background is HUGE for maximum smoothness

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "transparent",
      }}
    >
      {/* Rotating Gradient Background Circle - Masked */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: `calc(${SIZE} * 2.25)`,
          height: `calc(${SIZE} * 2.25)`,
          transform: "translate(-50%, -50%)",
          zIndex: 1,
          pointerEvents: "none",
          background: `conic-gradient(
            #FDA4AF,
            #34D399,
            #60A5FA,
            #FCD34D,
            #FDA4AF
          )`,
          animation: running ? "gradient-spin 2s linear infinite" : "none",
          // Mask: Only show gradient through the ring ("border") area
          WebkitMaskImage: `radial-gradient(circle at center, 
            transparent calc(50% - ${BORDER_WIDTH}px), 
            black calc(50% - ${BORDER_WIDTH - 2}px), 
            black calc(50% + ${BORDER_WIDTH - 2}px), 
            transparent calc(50% + ${BORDER_WIDTH}px)
          )`,
          maskImage: `radial-gradient(circle at center, 
            transparent calc(50% - ${BORDER_WIDTH}px), 
            black calc(50% - ${BORDER_WIDTH - 2}px), 
            black calc(50% + ${BORDER_WIDTH - 2}px), 
            transparent calc(50% + ${BORDER_WIDTH}px)
          )`,
        }}
        aria-hidden="true"
      ></div>

      {/* Timer Card */}
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
          width: SIZE,
          height: SIZE,
          background: "#fff",
          borderRadius: "4rem 3rem 2rem 1rem",
          fontFamily: "'Roboto Serif', serif",
          fontWeight: 900,
          fontSize: "clamp(2.4rem, 10vw, 6rem)",
          color: "#6B7280",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          userSelect: "none",
          boxShadow:
            running || pressed
              ? "none"
              : "0 6px 30px 0 rgba(0,0,0,0.15), 0 0 0 4px rgba(0,0,0,0.02)",
          cursor: "pointer",
          outline: pressed ? "2px solid #34D399" : "none",
          border: `${BORDER_WIDTH}px solid transparent`, // this creates the "window" into the spinning gradient
          transition:
            "box-shadow 0.15s cubic-bezier(.4,0,.2,1), outline 0.1s",
        }}
      >
        {formatTime(seconds)}
      </div>

      {/* Keyframes for spinning */}
      <style>
        {`
          @keyframes gradient-spin {
            100% { transform: translate(-50%, -50%) rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};


export { MeditationTimer };

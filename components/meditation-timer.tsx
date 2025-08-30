"use client";
import React, { useState, useRef, useEffect } from "react";

const TIMER_DURATION = 59; // seconds

export const MeditationTimer = () => {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(TIMER_DURATION);
  const intervalRef = useRef(null);

  // Timer logic (countdown)
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

  // Format time
  const formatTime = (s) =>
    s === 0
      ? "00:00"
      : `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(
          s % 60
        ).padStart(2, "0")}`;

  // For pressed effect
  const [pressed, setPressed] = useState(false);
  const handleClick = () => setRunning((r) => !r);

  // Style constants
  const SIZE = "min(70vw, 32vh)";
  const BORDER = 24; // px, thickness of solid border
  const BAND = 16;   // px, thickness of internal color band (the rotating gradient)

  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
      }}
    >
      <div
        style={{
          position: "relative",
          width: `calc(${SIZE} + ${2*BORDER}px)`,
          height: `calc(${SIZE} + ${2*BORDER}px)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Outer static solid border */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            borderRadius: "4rem 3rem 2rem 1rem",
            border: `${BORDER}px solid #6B7280`, // gray-500 border
            boxSizing: "border-box",
            zIndex: 1,
          }}
        />
        {/* Rotating gradient band inside the border */}
        <div
          style={{
            position: "absolute",
            top: BORDER - BAND,
            left: BORDER - BAND,
            width: `calc(100% - ${2*(BORDER - BAND)}px)`,
            height: `calc(100% - ${2*(BORDER - BAND)}px)`,
            borderRadius: "4rem 3rem 2rem 1rem",
            background: `conic-gradient(
              #FDA4AF, #34D399, #60A5FA, #FCD34D, #FDA4AF
            )`,
            zIndex: 2,
            animation: running ? "color-spin 2s linear infinite" : "none",
            // "clip-path" is used to make a ring/band shape
            clipPath: `polygon(
              0% 0%, 100% 0%, 100% 100%, 0% 100%, 
              0% calc(100% - ${BAND * 2}px), 
              calc(100% - ${BAND * 2}px) calc(100% - ${BAND * 2}px), 
              calc(100% - ${BAND * 2}px) ${BAND * 2}px, 
              ${BAND * 2}px ${BAND * 2}px, 
              ${BAND * 2}px calc(100% - ${BAND * 2}px), 
              0% calc(100% - ${BAND * 2}px)
            )`,
            boxShadow: "0 4px 24px rgba(0,0,0,0.13)",
            pointerEvents: "none",
          }}
        />
        {/* Timer Card */}
        <div
          role="button"
          tabIndex={0}
          aria-label={running ? "Pause timer" : "Start timer"}
          onClick={handleClick}
          onKeyDown={e => (e.key === "Enter" || e.key === " ") && handleClick()}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          style={{
            position: "relative",
            width: SIZE,
            height: SIZE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "4rem 3rem 2rem 1rem",
            background: "#fff",
            fontFamily: "'Roboto Serif', serif",
            fontWeight: 900,
            fontSize: "clamp(2.4rem, 10vw, 6rem)",
            color: "#6B7280",
            border: `${BAND}px solid transparent`,
            boxShadow:
              running || pressed
                ? "none"
                : "0 6px 30px 0 rgba(0,0,0,0.15), 0 0 0 4px rgba(0,0,0,0.02)",
            cursor: "pointer",
            userSelect: "none",
            outline: pressed ? "2px solid #34D399" : "none",
            transition:
              "box-shadow 0.15s cubic-bezier(.4,0,.2,1), outline 0.1s",
            textAlign: "center",
            lineHeight: 1,
            zIndex: 3,
          }}
        >
          {formatTime(seconds)}
        </div>
      </div>
      <style>
        {`
          @keyframes color-spin {
            100% { transform: rotate(360deg);}
          }
        `}
      </style>
    </div>
  );
};

export { MeditationTimer };

"use client";
import React, { useState, useEffect, useRef } from "react";

const TIMER_DURATION = 59; // seconds

const MeditationTimer = () => {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(TIMER_DURATION);
  const intervalRef = useRef(null);

  // Countdown timer logic
  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
      return () => clearInterval(intervalRef.current);
    }
    clearInterval(intervalRef.current);
    return undefined;
  }, [running, seconds]);

  // Format as mm:ss
  const formatTime = (s) =>
    s === 0
      ? "00:00"
      : `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(
          s % 60
        ).padStart(2, "0")}`;

  // Toggle running/paused
  const handleClick = () => setRunning((r) => !r);

  // Sizing for adaptability and shadow effect
  const CARD_SIZE = "min(70vw, 35vh)";
  const BORDER_THICKNESS = 12; // px

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: CARD_SIZE,
          height: CARD_SIZE,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Rotating Gradient Border */}
        <div
          aria-hidden="true"
          style={{
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
            zIndex: 1,
            borderRadius: "4rem 3rem 2rem 1rem",
            padding: 0,
            background: `conic-gradient(
              from 0deg,
              #FDA4AF, /* logo-rose-300 */
              #34D399, /* logo-emerald-500 */
              #60A5FA, /* logo-blue-400 */
              #FCD34D, /* logo-amber-300 */
              #FDA4AF
            )`,
            maskImage: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`, // For modern browsers; ensures only the border is shown
            WebkitMaskImage: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
            padding: 0,
            border: `${BORDER_THICKNESS}px solid transparent`,
            boxSizing: "border-box",
            filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.20))",
            animation: running ? "border-spin 2s linear infinite" : "none",
            transition: "filter 0.15s cubic-bezier(.4,0,.2,1)",
            ...(running && { filter: "none" }), // Pressed effect removes shadow
          }}
        ></div>
        {/* Card with timer */}
        <div
          onClick={handleClick}
          role="button"
          tabIndex={0}
          style={{
            cursor: "pointer",
            zIndex: 2,
            position: "relative",
            width: `calc(${CARD_SIZE} - ${BORDER_THICKNESS * 2}px)`,
            height: `calc(${CARD_SIZE} - ${BORDER_THICKNESS * 2}px)`,
            background: "#fff",
            borderRadius: "4rem 3rem 2rem 1rem",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontFamily: "'Roboto Serif', serif",
            fontWeight: 900,
            fontSize: "clamp(2rem,12vw,6rem)",
            color: "#6B7280",
            userSelect: "none",
            boxShadow: running
              ? "none"
              : "0 4px 24px rgba(0,0,0,0.20), 0 0 0 4px rgba(0,0,0,0.02)",
            border: "none",
            transition: "box-shadow 0.15s cubic-bezier(.4,0,.2,1) background 0.2s",
          }}
        >
          {formatTime(seconds)}
        </div>
      </div>
      <style>
        {`
          @keyframes border-spin {
            100% {
              transform: rotate(360deg);
            }
          }
          /* Progressive enhancement: mask only for supporting browsers */
          @supports (mask-image: linear-gradient(#fff 0 0)) or (-webkit-mask-image: linear-gradient(#fff 0 0)) {
            div[aria-hidden="true"] {
              padding: 0 !important;
              -webkit-mask:
                linear-gradient(#fff 0 0) content-box,
                linear-gradient(#fff 0 0);
              -webkit-mask-composite: xor;
              mask:
                linear-gradient(#fff 0 0) content-box,
                linear-gradient(#fff 0 0);
              mask-composite: exclude;
            }
          }
        `}
      </style>
    </div>
  );
};

export { MeditationTimer };

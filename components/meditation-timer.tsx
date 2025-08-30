"use client";
import React, { useState, useEffect, useRef } from "react";

const TIMER_DURATION = 59; // seconds

const MeditationTimer = () => {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(TIMER_DURATION);
  const intervalRef = useRef(null);

  // Timer countdown effect
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

  // Format time as mm:ss
  const formatTime = (s) =>
    s === 0
      ? "00:00"
      : `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(
          s % 60
        ).padStart(2, "0")}`;

  // Toggle start/pause/pressed state
  const handleClick = () => setRunning((r) => !r);

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
        onClick={handleClick}
        style={{
          display: "inline-block",
          borderRadius: "4rem 3rem 2rem 1rem",
          padding: "0.5rem",
          background: `
            conic-gradient(
              from 0deg,
              #FDA4AF, /* logo-rose-300 */
              #34D399, /* logo-emerald-500 */
              #60A5FA, /* logo-blue-400 */
              #FCD34D, /* logo-amber-300 */
              #FDA4AF   /* loop to rose-300 */
            )
          `,
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
          boxShadow: running
            ? "none"
            : "0 4px 24px rgba(0,0,0,0.20), 0 0 0 4px rgba(0,0,0,0.02)",
          animation: running ? "border-spin 2s linear infinite" : "none",
          willChange: "transform",
          cursor: "pointer",
          transition: "box-shadow 0.15s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "4rem 3rem 2rem 1rem",
            padding: "0.5em 2em",
            fontFamily: "'Roboto Serif', serif",
            fontWeight: 900,
            fontSize: "clamp(2rem,12vw,6rem)",
            color: "#6B7280",
            border: "6px solid transparent",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minWidth: "5ch",
            userSelect: "none",
            transition: "background 0.2s",
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
        `}
      </style>
    </div>
  );
};

export { MeditationTimer };

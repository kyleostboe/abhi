"use client"

const Timer = () => (
  <div
    style={{
      display: "inline-block",
      borderRadius: "4rem 3rem 2rem 1rem",
      padding: "0.5rem",
      background: `
        linear-gradient(90deg, #FDA4AF, #34D399),
        linear-gradient(270deg, #60A5FA, #FCD34D)
      `,
      backgroundOrigin: "border-box",
      backgroundClip: "padding-box, border-box",
      boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
    }}
  >
    <div
      style={{
        background: "#fff", // Inner background; set to match your app
        borderRadius: "4rem 3rem 2rem 1rem",
        padding: "0.5em 2em",
        fontFamily: "'Roboto Serif', serif",
        fontWeight: 900,
        fontSize: "6rem",
        color: "#6B7280", // Tailwind gray-500
        border: "6px solid transparent", // Allow gradient border to show
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      00:59
    </div>
  </div>
)

export { Timer as MeditationTimer }

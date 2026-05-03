import React from "react";

interface LoadingScreenProps {
  message: string;
  progress: number;
}

export function LoadingScreen({ message, progress }: LoadingScreenProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#080a0e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2rem",
        zIndex: 1000,
      }}
    >
      {/* Logo / title */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: "3rem",
            fontWeight: 700,
            letterSpacing: "0.4em",
            color: "#00d4ff",
            textTransform: "uppercase",
            textShadow: "0 0 40px rgba(0,212,255,0.5)",
            marginBottom: "0.25rem",
          }}
        >
          CAR SCENE
        </div>
        <div
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.75rem",
            letterSpacing: "0.3em",
            color: "#3d5068",
            textTransform: "uppercase",
          }}
        >
          MULTI-CAMERA VIEWER v1.0
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ width: "340px" }}>
        <div
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.7rem",
            color: "#7a8fa6",
            marginBottom: "0.5rem",
            letterSpacing: "0.1em",
          }}
        >
          {message}
        </div>
        <div
          style={{
            height: "2px",
            background: "#1a2332",
            borderRadius: "1px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #0066aa, #00d4ff)",
              boxShadow: "0 0 12px rgba(0,212,255,0.6)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <div
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.65rem",
            color: "#3d5068",
            marginTop: "0.4rem",
            textAlign: "right",
          }}
        >
          {Math.round(progress)}%
        </div>
      </div>

      {/* Animated grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
          linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
        `,
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />

      {/* Corner decorations */}
      {(["topLeft", "topRight", "bottomLeft", "bottomRight"] as const).map(
        (pos) => (
          <div
            key={pos}
            style={{
              position: "absolute",
              width: "40px",
              height: "40px",
              ...(pos.includes("top") ? { top: "24px" } : { bottom: "24px" }),
              ...(pos.includes("Left") ? { left: "24px" } : { right: "24px" }),
              borderTop: pos.includes("top") ? "1px solid #00d4ff40" : "none",
              borderBottom: pos.includes("bottom")
                ? "1px solid #00d4ff40"
                : "none",
              borderLeft: pos.includes("Left") ? "1px solid #00d4ff40" : "none",
              borderRight: pos.includes("Right")
                ? "1px solid #00d4ff40"
                : "none",
            }}
          />
        ),
      )}
    </div>
  );
}

import React from "react";

interface CameraLabelProps {
  label: string;
  isMain?: boolean;
  isActive?: boolean;
}

export function CameraLabel({
  label,
  isMain = false,
  isActive = false,
}: CameraLabelProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: "8px",
        left: "8px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      {/* Live indicator dot */}
      <div
        style={{
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          background: isActive ? "#ff2244" : "#3d5068",
          boxShadow: isActive ? "0 0 6px rgba(255,34,68,0.8)" : "none",
          flexShrink: 0,
          animation: isActive ? "blink 1.2s infinite" : "none",
        }}
      />
      <div
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: isMain ? "0.65rem" : "0.58rem",
          color: isMain ? "#00d4ff" : "#7a8fa6",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          textShadow: isMain ? "0 0 12px rgba(0,212,255,0.5)" : "none",
          background: "rgba(8,10,14,0.7)",
          padding: "2px 6px",
          borderRadius: "2px",
        }}
      >
        {label}
      </div>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}

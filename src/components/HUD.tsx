import React from "react";

interface HUDProps {
  currentCar: number;
  totalCars: number;
  allFinished: boolean;
  isLocked: boolean;
  speed: number;
  onSpeedChange: (v: number) => void;
}

export function HUD({
  currentCar,
  totalCars,
  allFinished,
  speed,
  onSpeedChange,
}: HUDProps) {
  return (
    <>
      {/* Top status bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "36px",
          background:
            "linear-gradient(180deg, rgba(8,10,14,0.95) 0%, transparent 100%)",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: "16px",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.65rem",
            color: "#00d4ff",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            opacity: 0.8,
          }}
        >
          CAR SCENE // MULTI-CAM
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.65rem",
            color: "#7a8fa6",
            letterSpacing: "0.15em",
          }}
        >
          {allFinished ? (
            <span style={{ color: "#00ff88" }}>● ALL SEQUENCES COMPLETE</span>
          ) : (
            <span>
              SEQUENCE{" "}
              <span style={{ color: "#ff6b00" }}>
                {Math.min(currentCar + 1, totalCars)}/{totalCars}
              </span>{" "}
              — CAR_{Math.min(currentCar + 1, totalCars)} ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Car sequence dots */}
      <div
        style={{
          position: "absolute",
          bottom: "12px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "6px",
          alignItems: "center",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        {Array.from({ length: totalCars }, (_, i) => (
          <div
            key={i}
            style={{
              width: i === currentCar && !allFinished ? "20px" : "6px",
              height: "3px",
              borderRadius: "2px",
              background:
                i < currentCar || allFinished
                  ? "#00d4ff"
                  : i === currentCar && !allFinished
                    ? "#ff6b00"
                    : "#1a2332",
              boxShadow:
                i < currentCar || allFinished
                  ? "0 0 6px rgba(0,212,255,0.6)"
                  : i === currentCar && !allFinished
                    ? "0 0 6px rgba(255,107,0,0.6)"
                    : "none",
              transition: "all 0.4s ease",
            }}
          />
        ))}
      </div>

      {/* Speed + Skip controls — bottom right */}
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          right: "12px",
          background: "rgba(8,10,14,0.85)",
          border: "1px solid #1a2332",
          borderRadius: "4px",
          padding: "8px 12px",
          zIndex: 10,
          minWidth: "180px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {/* Speed label + slider */}
        <div>
          <div
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.6rem",
              color: "#00d4ff",
              letterSpacing: "0.1em",
              marginBottom: "4px",
            }}
          >
            ANIM SPEED — {speed.toFixed(2)}x
          </div>
          <input
            type="range"
            min={0.25}
            max={8}
            step={0.25}
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#ff6b00", cursor: "pointer" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.55rem",
              color: "#3a5068",
              marginTop: "2px",
            }}
          >
            <span>0.25x</span>
            <span>8x</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid #1a2332" }} />

        {/* Skip button */}
        <button
          disabled={allFinished}
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.6rem",
            letterSpacing: "0.12em",
            color: allFinished ? "#3a5068" : "#ff6b00",
            background: "transparent",
            border: `1px solid ${allFinished ? "#1a2332" : "#ff6b00"}`,
            borderRadius: "3px",
            padding: "5px 0",
            cursor: allFinished ? "default" : "pointer",
            transition: "all 0.15s",
            width: "100%",
          }}
          onMouseEnter={(e) => {
            if (!allFinished)
              e.currentTarget.style.background = "rgba(255,107,0,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          ▶▶ SKIP CURRENT CAR
        </button>
      </div>
    </>
  );
}

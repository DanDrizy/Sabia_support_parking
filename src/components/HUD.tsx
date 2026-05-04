import React from "react";

// HUD is now minimal — the bottom strip in SceneViewer contains playback controls.
// This component only handles the top status bar and the free-cam toggle badge.
interface HUDProps {
  currentCar: number;
  totalCars: number;
  allFinished: boolean;
  isLocked: boolean;
  speed: number;
  onSpeedChange: (v: number) => void;
  isPaused: boolean;
  isCurrentFinished: boolean;
  carSpeedBoost: number;
  onTogglePause: () => void;
  onFaster: () => void;
  onRepeat: () => void;
  onPrevious: () => void;
  onNext: () => void;
  progress: number;
  duration: number;
  onSeek: (time: number) => void;
  playerControlEnabled: boolean;
  onTogglePlayerControl: () => void;
  onSkip?: () => void;
}

export function HUD({
  currentCar,
  totalCars,
  allFinished,
  playerControlEnabled,
  onTogglePlayerControl,
}: HUDProps) {
  return (
    <>
      {/* ── Top status bar ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "32px",
          background:
            "linear-gradient(180deg, rgba(6,8,12,0.96) 0%, transparent 100%)",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: "12px",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.6rem",
            color: "#00d4ff",
            letterSpacing: "0.22em",
            opacity: 0.75,
          }}
        >
          CAR SCENE // MULTI-CAM
        </div>

        {playerControlEnabled && (
          <div
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.55rem",
              color: "#ffcc00",
              letterSpacing: "0.12em",
              border: "1px solid rgba(255,204,0,0.35)",
              borderRadius: "3px",
              padding: "1px 7px",
            }}
          >
            ✦ FREE CAM
          </div>
        )}

        <div
          style={{
            marginLeft: "auto",
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.6rem",
            color: "#7a8fa6",
            letterSpacing: "0.13em",
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

        {/* Free-cam toggle button — right side of top bar, pointer-events on */}
        <button
          onClick={onTogglePlayerControl}
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.55rem",
            letterSpacing: "0.1em",
            color: playerControlEnabled ? "#ffcc00" : "#3a5068",
            background: "transparent",
            border: `1px solid ${playerControlEnabled ? "rgba(255,204,0,0.4)" : "#1a2332"}`,
            borderRadius: "3px",
            padding: "2px 8px",
            cursor: "pointer",
            pointerEvents: "auto",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = playerControlEnabled
              ? "rgba(255,204,0,0.8)"
              : "#3a5068";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = playerControlEnabled
              ? "rgba(255,204,0,0.4)"
              : "#1a2332";
          }}
        >
          ✦ FREE CAM
        </button>
      </div>
    </>
  );
}

import React from "react";
import { MainCamKey } from "../types";

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
  // ── Multi main camera ──────────────────────────────────────────────────────
  activeCam: MainCamKey;
  availableMainCams: MainCamKey[]; // only cams that actually exist in the GLB
  onSwitchCamera: (cam: MainCamKey) => void;
}

const CAM_LABELS: Record<MainCamKey, string> = {
  main:  "CAM 1",
  main2: "CAM 2",
  main3: "CAM 3",
  main4: "CAM 4",
  main5: "CAM 5",
};

export function HUD({
  currentCar,
  totalCars,
  allFinished,
  playerControlEnabled,
  onTogglePlayerControl,
  activeCam,
  availableMainCams,
  onSwitchCamera,
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
          height: "40px",
          background:
            "linear-gradient(180deg, rgba(6,8,12,0.96) 0%, transparent 100%)",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: "8px",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        {/* Brand tag */}
        <div
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.6rem",
            color: "#00d4ff",
            letterSpacing: "0.22em",
            opacity: 0.75,
            flexShrink: 0,
          }}
        >
          CAR SCENE // MULTI-CAM
        </div>

        {/* Free-cam badge (display only) */}
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
              flexShrink: 0,
            }}
          >
            ✦ FREE CAM
          </div>
        )}

        {/* ── Main camera switcher — centre of bar ─────────────────────────── */}
        {availableMainCams.length > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              pointerEvents: "auto",
              // push to centre
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            {/* Small label */}
            <span
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: "0.5rem",
                color: "#3a5068",
                letterSpacing: "0.12em",
                marginRight: "4px",
              }}
            >
              VIEW
            </span>

            {availableMainCams.map((key) => {
              const active = activeCam === key;
              return (
                <button
                  key={key}
                  onClick={() => onSwitchCamera(key)}
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: "0.55rem",
                    letterSpacing: "0.12em",
                    padding: "3px 10px",
                    background: active
                      ? "rgba(0,212,255,0.18)"
                      : "rgba(6,8,12,0.75)",
                    border: `1px solid ${active ? "rgba(0,212,255,0.65)" : "rgba(40,60,80,0.8)"}`,
                    borderRadius: "3px",
                    color: active ? "#00d4ff" : "#4a6a8a",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    boxShadow: active
                      ? "0 0 10px rgba(0,212,255,0.25)"
                      : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.borderColor =
                        "rgba(0,212,255,0.35)";
                      e.currentTarget.style.color = "#7a9ab6";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.borderColor =
                        "rgba(40,60,80,0.8)";
                      e.currentTarget.style.color = "#4a6a8a";
                    }
                  }}
                >
                  {CAM_LABELS[key]}
                </button>
              );
            })}
          </div>
        )}

        {/* Sequence status — right side */}
        <div
          style={{
            marginLeft: "auto",
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.6rem",
            color: "#7a8fa6",
            letterSpacing: "0.13em",
            flexShrink: 0,
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

        {/* Free-cam toggle button */}
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
            flexShrink: 0,
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
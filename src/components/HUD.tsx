import React from "react";

interface HUDProps {
  currentCar: number;
  totalCars: number;
  allFinished: boolean;
  isLocked: boolean;
  speed: number;
  onSpeedChange: (v: number) => void;
  onSkip: () => void;
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
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function HUD({
  currentCar,
  totalCars,
  allFinished,
  speed,
  onSpeedChange,
  isPaused,
  isCurrentFinished,
  carSpeedBoost,
  onTogglePause,
  onFaster,
  onRepeat,
  onPrevious,
  onNext,
  progress,
  duration,
  onSeek,
  playerControlEnabled,
  onTogglePlayerControl,
}: HUDProps) {
  const btnBase: React.CSSProperties = {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: "0.6rem",
    letterSpacing: "0.12em",
    background: "transparent",
    borderRadius: "3px",
    padding: "5px 0",
    width: "100%",
    cursor: "pointer",
    transition: "all 0.15s",
  };

  const activeBtn = (color: string): React.CSSProperties => ({
    ...btnBase,
    color,
    border: `1px solid ${color}`,
  });

  const disabledBtn: React.CSSProperties = {
    ...btnBase,
    color: "#3a5068",
    border: "1px solid #1a2332",
    cursor: "default",
  };

  const pauseDisabled = isCurrentFinished || allFinished;
  const fasterDisabled = isCurrentFinished || allFinished || isPaused;
  const repeatDisabled = !isCurrentFinished;
  const prevDisabled = currentCar === 0;
  const nextDisabled = allFinished || currentCar >= totalCars - 1;
  const pct = duration > 0 ? (progress / duration) * 100 : 0;

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

        {/* Player control mode indicator */}
        {playerControlEnabled && (
          <div
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.6rem",
              color: "#ffcc00",
              letterSpacing: "0.15em",
              border: "1px solid rgba(255,204,0,0.4)",
              borderRadius: "3px",
              padding: "2px 8px",
            }}
          >
            ✦ FREE CAM — WASD / DRAG / SCROLL
          </div>
        )}

        <div
          style={{
            marginLeft: "auto",
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.65rem",
            color: "#7a8fa6",
            letterSpacing: "0.15em",
            pointerEvents: "none",
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

      {/* ── Timeline bar — bottom centre ── */}
      <div
        style={{
          position: "absolute",
          bottom: "28px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "clamp(300px, 55vw, 700px)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {/* Car dots */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
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

        {/* Prev / scrubber / Next */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            width: "100%",
          }}
        >
          <button
            onClick={prevDisabled ? undefined : onPrevious}
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.6rem",
              letterSpacing: "0.08em",
              color: prevDisabled ? "#1a2332" : "#7a8fa6",
              background: "transparent",
              border: `1px solid ${prevDisabled ? "#1a2332" : "#2a3a4a"}`,
              borderRadius: "3px",
              padding: "4px 8px",
              cursor: prevDisabled ? "default" : "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!prevDisabled) e.currentTarget.style.borderColor = "#7a8fa6";
            }}
            onMouseLeave={(e) => {
              if (!prevDisabled) e.currentTarget.style.borderColor = "#2a3a4a";
            }}
          >
            ◀ PREV
          </button>

          <span
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.6rem",
              color: "#3a5068",
              flexShrink: 0,
              minWidth: "32px",
              textAlign: "right",
            }}
          >
            {formatTime(progress)}
          </span>

          {/* Scrubber */}
          <div
            style={{
              flex: 1,
              position: "relative",
              height: "20px",
              display: "flex",
              alignItems: "center",
              cursor: duration > 0 ? "pointer" : "default",
            }}
            onClick={(e) => {
              if (duration <= 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              onSeek(Math.max(0, Math.min(1, ratio)) * duration);
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: "2px",
                background: "#1a2332",
                borderRadius: "1px",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                width: `${pct}%`,
                height: "2px",
                background: "linear-gradient(90deg, #0066aa, #00d4ff)",
                borderRadius: "1px",
                transition: "width 0.05s linear",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: `${pct}%`,
                transform: "translateX(-50%)",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#00d4ff",
                boxShadow: "0 0 6px rgba(0,212,255,0.7)",
                transition: "left 0.05s linear",
              }}
            />
          </div>

          <span
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.6rem",
              color: "#3a5068",
              flexShrink: 0,
              minWidth: "32px",
            }}
          >
            {formatTime(duration)}
          </span>

          <button
            onClick={nextDisabled ? undefined : onNext}
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.6rem",
              letterSpacing: "0.08em",
              color: nextDisabled ? "#1a2332" : "#7a8fa6",
              background: "transparent",
              border: `1px solid ${nextDisabled ? "#1a2332" : "#2a3a4a"}`,
              borderRadius: "3px",
              padding: "4px 8px",
              cursor: nextDisabled ? "default" : "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!nextDisabled) e.currentTarget.style.borderColor = "#7a8fa6";
            }}
            onMouseLeave={(e) => {
              if (!nextDisabled) e.currentTarget.style.borderColor = "#2a3a4a";
            }}
          >
            NEXT ▶
          </button>
        </div>
      </div>

      {/* Controls panel — bottom right */}
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
        {/* Speed slider */}
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

        <div style={{ borderTop: "1px solid #1a2332" }} />

        {/* Play / Pause */}
        <button
          onClick={pauseDisabled ? undefined : onTogglePause}
          style={pauseDisabled ? disabledBtn : activeBtn("#00ff88")}
          onMouseEnter={(e) => {
            if (!pauseDisabled)
              e.currentTarget.style.background = "rgba(0,255,136,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          {isPaused ? "▶ PLAY" : "⏸ PAUSE"}
        </button>

        {/* 1× Faster */}
        <button
          onClick={fasterDisabled ? undefined : onFaster}
          style={fasterDisabled ? disabledBtn : activeBtn("#ff6b00")}
          onMouseEnter={(e) => {
            if (!fasterDisabled)
              e.currentTarget.style.background = "rgba(255,107,0,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          ▶▶ 1× FASTER{carSpeedBoost > 1 ? ` (+${carSpeedBoost - 1})` : ""}
        </button>

        {/* Repeat */}
        <button
          onClick={repeatDisabled ? undefined : onRepeat}
          style={repeatDisabled ? disabledBtn : activeBtn("#00d4ff")}
          onMouseEnter={(e) => {
            if (!repeatDisabled)
              e.currentTarget.style.background = "rgba(0,212,255,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          ↺ REPEAT
        </button>

        <div style={{ borderTop: "1px solid #1a2332" }} />

        {/* Free cam toggle */}
        <button
          onClick={onTogglePlayerControl}
          style={activeBtn(playerControlEnabled ? "#ffcc00" : "#3a5068")}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = playerControlEnabled
              ? "rgba(255,204,0,0.1)"
              : "rgba(255,255,255,0.04)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          {playerControlEnabled ? "✦ FREE CAM ON" : "✦ FREE CAM"}
        </button>
      </div>
    </>
  );
}
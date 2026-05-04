import React, { useRef } from "react";
import { PlacedSensor, SensorOccupancy } from "../types";

interface SensorPanelProps {
  nextIndex: number;
  totalSensors: number;
  placedSensors: PlacedSensor[];
  occupancy: SensorOccupancy[]; // live per-sensor occupancy
  allPlaced: boolean;
  barrierAvailable: boolean;
  barrierPlaced: boolean;
  barrierClosed: boolean;
  onRemove: (index: number) => void;
  onRemoveAll: () => void;
  onBarrierDrop: () => void;
  onBarrierRemove: () => void;
}

export function SensorPanel({
  nextIndex,
  totalSensors,
  placedSensors,
  occupancy,
  allPlaced,
  barrierAvailable,
  barrierPlaced,
  barrierClosed,
  onRemove,
  onRemoveAll,
  onBarrierDrop,
  onBarrierRemove,
}: SensorPanelProps) {
  const draggingRef = useRef(false);

  const occupancyMap = new Map<number, SensorOccupancy>(
    occupancy.map((o) => [o.sensorIndex, o]),
  );

  const occupiedCount = occupancy.filter((o) => o.occupied).length;
  const canPlace = !allPlaced && totalSensors > 0;

  const handleDragStart = (e: React.DragEvent, item: "sensor" | "barrier") => {
    draggingRef.current = true;
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", item);
  };
  const handleDragEnd = () => {
    draggingRef.current = false;
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "44px",
        left: "8px",
        width: "172px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        zIndex: 20,
        pointerEvents: "auto",
      }}
    >
      {/* ── Header card ───────────────────────────────────────────────────── */}
      <div
        style={{
          background: "rgba(8,10,14,0.92)",
          border: "1px solid #1a2332",
          borderRadius: "4px",
          padding: "10px 12px",
        }}
      >
        {/* Title row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.6rem",
              color: "#00d4ff",
              letterSpacing: "0.2em",
            }}
          >
            PARKING SENSORS
          </div>
          {placedSensors.length > 0 && (
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: "0.55rem",
                color: occupiedCount > 0 ? "#ff2244" : "#00ff88",
                letterSpacing: "0.1em",
              }}
            >
              {occupiedCount}/{placedSensors.length}
            </div>
          )}
        </div>

        {/* Summary bar — only when sensors are placed */}
        {placedSensors.length > 0 && (
          <div style={{ display: "flex", gap: "4px", marginBottom: "10px" }}>
            {placedSensors.map((s) => {
              const o = occupancyMap.get(s.index);
              const col = o?.occupied ? "#ff2244" : "#00ff88";
              return (
                <div
                  key={s.index}
                  title={`SENSOR ${s.index}: ${o?.occupied ? "OCCUPIED" : "EMPTY"}`}
                  style={{
                    flex: 1,
                    height: "4px",
                    borderRadius: "2px",
                    background: col,
                    boxShadow: `0 0 6px ${col}88`,
                    transition: "background 0.3s, box-shadow 0.3s",
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Placed count */}
        <div
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.55rem",
            color: "#7a8fa6",
            letterSpacing: "0.1em",
            marginBottom: "10px",
          }}
        >
          {placedSensors.length} / {totalSensors} SENSORS ACTIVE
        </div>

        {/* ── Draggable sensor widget ──────────────────────────────────────── */}
        {canPlace ? (
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, "sensor")}
            onDragEnd={handleDragEnd}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 10px",
              background: "rgba(0,212,255,0.06)",
              border: "1px dashed rgba(0,212,255,0.35)",
              borderRadius: "4px",
              cursor: "grab",
              userSelect: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0,212,255,0.12)";
              e.currentTarget.style.borderColor = "rgba(0,212,255,0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0,212,255,0.06)";
              e.currentTarget.style.borderColor = "rgba(0,212,255,0.35)";
            }}
          >
            <SensorIcon color="#00d4ff" />
            <div>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "0.58rem",
                  color: "#00d4ff",
                  letterSpacing: "0.1em",
                }}
              >
                SENSOR {nextIndex}
              </div>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "0.5rem",
                  color: "#3d5068",
                  letterSpacing: "0.05em",
                  marginTop: "2px",
                }}
              >
                DRAG → MAIN VIEW
              </div>
            </div>
          </div>
        ) : totalSensors === 0 ? (
          <div
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.55rem",
              color: "#3d5068",
              letterSpacing: "0.08em",
              lineHeight: 1.7,
              padding: "4px 0",
            }}
          >
            sensors.glb
            <br />
            not loaded
          </div>
        ) : (
          <div
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.55rem",
              color: "#00ff88",
              letterSpacing: "0.1em",
              padding: "4px 0",
            }}
          >
            ✓ ALL SENSORS ACTIVE
          </div>
        )}

        {/* Remove all */}
        {placedSensors.length > 0 && (
          <button
            onClick={onRemoveAll}
            style={{
              marginTop: "8px",
              width: "100%",
              padding: "4px 0",
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.55rem",
              letterSpacing: "0.1em",
              color: "#ff2244",
              background: "transparent",
              border: "1px solid rgba(255,34,68,0.3)",
              borderRadius: "3px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,34,68,0.08)";
              e.currentTarget.style.borderColor = "rgba(255,34,68,0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(255,34,68,0.3)";
            }}
          >
            ✕ REMOVE ALL
          </button>
        )}
      </div>

      <div
        style={{
          background: "rgba(8,10,14,0.92)",
          border: "1px solid #1a2332",
          borderRadius: "4px",
          padding: "10px 12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.6rem",
              color: "#ffcc00",
              letterSpacing: "0.2em",
            }}
          >
            BARRIER
          </div>
          {barrierPlaced && (
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: "0.52rem",
                color: barrierClosed ? "#ff2244" : "#00ff88",
                letterSpacing: "0.12em",
              }}
            >
              {barrierClosed ? "CLOSED" : "OPEN"}
            </div>
          )}
        </div>

        {!barrierAvailable ? (
          <div
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.55rem",
              color: "#3d5068",
              letterSpacing: "0.08em",
              lineHeight: 1.7,
              padding: "4px 0",
            }}
          >
            barrier.glb
            <br />
            not loaded
          </div>
        ) : !barrierPlaced ? (
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, "barrier")}
            onDragEnd={handleDragEnd}
            onDoubleClick={onBarrierDrop}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 10px",
              background: "rgba(255,204,0,0.06)",
              border: "1px dashed rgba(255,204,0,0.35)",
              borderRadius: "4px",
              cursor: "grab",
              userSelect: "none",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,204,0,0.12)";
              e.currentTarget.style.borderColor = "rgba(255,204,0,0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,204,0,0.06)";
              e.currentTarget.style.borderColor = "rgba(255,204,0,0.35)";
            }}
          >
            <BarrierIcon color="#ffcc00" />
            <div>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "0.58rem",
                  color: "#ffcc00",
                  letterSpacing: "0.1em",
                }}
              >
                GATE ARM
              </div>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: "0.5rem",
                  color: "#5e5432",
                  letterSpacing: "0.05em",
                  marginTop: "2px",
                }}
              >
                DRAG → MAIN VIEW
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={onBarrierRemove}
            style={{
              width: "100%",
              padding: "5px 0",
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.55rem",
              letterSpacing: "0.1em",
              color: "#ffcc00",
              background: "transparent",
              border: "1px solid rgba(255,204,0,0.3)",
              borderRadius: "3px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,204,0,0.08)";
              e.currentTarget.style.borderColor = "rgba(255,204,0,0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(255,204,0,0.3)";
            }}
          >
            REMOVE BARRIER
          </button>
        )}
      </div>

      {/* ── Per-sensor occupancy cards ──────────────────────────────────────── */}
      {placedSensors.length > 0 && (
        <div
          style={{
            background: "rgba(8,10,14,0.92)",
            border: "1px solid #1a2332",
            borderRadius: "4px",
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            maxHeight: "320px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.52rem",
              color: "#3d5068",
              letterSpacing: "0.15em",
              marginBottom: "4px",
            }}
          >
            SPACE STATUS
          </div>

          {placedSensors.map((s) => {
            const o = occupancyMap.get(s.index);
            const occupied = o?.occupied ?? false;
            const carLabel = o?.carIndex != null ? `CAR_${o.carIndex}` : null;
            const plateLabel = o?.plateNumber ?? carLabel;
            const cameraLabel = o?.plateCamera ? "CAPTURE PLATE CAM" : null;
            const distLabel =
              o && o.distance >= 0
                ? `${(o.distance * 100).toFixed(1)}cm`
                : null;

            return (
              <div
                key={s.index}
                style={{
                  borderRadius: "3px",
                  border: `1px solid ${occupied ? "rgba(255,34,68,0.35)" : "rgba(0,255,136,0.2)"}`,
                  background: occupied
                    ? "rgba(255,34,68,0.06)"
                    : "rgba(0,255,136,0.04)",
                  overflow: "hidden",
                  transition: "border-color 0.3s, background 0.3s",
                }}
              >
                {/* Top row: sensor label + status badge + remove */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "5px 7px",
                    gap: "6px",
                  }}
                >
                  {/* Animated dot */}
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: occupied ? "#ff2244" : "#00ff88",
                      boxShadow: occupied
                        ? "0 0 6px rgba(255,34,68,0.9)"
                        : "0 0 5px rgba(0,255,136,0.7)",
                      animation: occupied
                        ? "sensorOccupied 0.8s infinite"
                        : "sensorFree 2.5s infinite",
                    }}
                  />

                  {/* Label */}
                  <span
                    style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: "0.55rem",
                      color: "#c8d8e8",
                      letterSpacing: "0.08em",
                      flex: 1,
                    }}
                  >
                    {s.label}
                  </span>

                  {/* Status badge */}
                  <span
                    style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: "0.48rem",
                      letterSpacing: "0.1em",
                      color: occupied ? "#ff2244" : "#00ff88",
                      border: `1px solid ${occupied ? "rgba(255,34,68,0.4)" : "rgba(0,255,136,0.3)"}`,
                      borderRadius: "2px",
                      padding: "1px 4px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {occupied ? "TAKEN" : "EMPTY"}
                  </span>

                  {/* Remove btn */}
                  <button
                    onClick={() => onRemove(s.index)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#3d5068",
                      cursor: "pointer",
                      fontSize: "0.65rem",
                      lineHeight: 1,
                      padding: "0 0 0 2px",
                      transition: "color 0.15s",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#ff2244")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#3d5068")
                    }
                    title={`Remove ${s.label}`}
                  >
                    ✕
                  </button>
                </div>

                {/* Bottom row: detected car info — only shown when occupied */}
                {occupied && plateLabel && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "3px 7px 5px 19px",
                      borderTop: "1px solid rgba(255,34,68,0.15)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      {/* Car icon */}
                      <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                        <rect
                          x="1"
                          y="2"
                          width="10"
                          height="5"
                          rx="1"
                          fill="#ff2244"
                          opacity="0.7"
                        />
                        <rect
                          x="2"
                          y="0"
                          width="8"
                          height="3"
                          rx="1"
                          fill="#ff2244"
                          opacity="0.5"
                        />
                        <circle
                          cx="3"
                          cy="7"
                          r="1"
                          fill="#ff2244"
                          opacity="0.9"
                        />
                        <circle
                          cx="9"
                          cy="7"
                          r="1"
                          fill="#ff2244"
                          opacity="0.9"
                        />
                      </svg>
                      <span
                        style={{
                          fontFamily: "'Share Tech Mono', monospace",
                          fontSize: "0.5rem",
                          color: "#ff6b6b",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {plateLabel}
                      </span>
                      {cameraLabel && (
                        <span
                          style={{
                            fontFamily: "'Share Tech Mono', monospace",
                            fontSize: "0.42rem",
                            color: "#7a4a4a",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {cameraLabel}
                        </span>
                      )}
                    </div>
                    {distLabel && (
                      <span
                        style={{
                          fontFamily: "'Share Tech Mono', monospace",
                          fontSize: "0.48rem",
                          color: "#7a4a4a",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {distLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes sensorOccupied {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @keyframes sensorFree {
          0%, 100% { opacity: 1;   box-shadow: 0 0 5px rgba(0,255,136,0.7); }
          50%       { opacity: 0.6; box-shadow: 0 0 2px rgba(0,255,136,0.2); }
        }
      `}</style>
    </div>
  );
}

function SensorIcon({ color }: { color: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <circle cx="11" cy="11" r="3.5" fill={color} opacity="0.9" />
      <circle
        cx="11"
        cy="11"
        r="7"
        stroke={color}
        strokeWidth="1"
        opacity="0.4"
      />
      <circle
        cx="11"
        cy="11"
        r="10"
        stroke={color}
        strokeWidth="0.5"
        opacity="0.2"
      />
      <line
        x1="11"
        y1="1"
        x2="11"
        y2="4"
        stroke={color}
        strokeWidth="1"
        opacity="0.5"
      />
      <line
        x1="11"
        y1="18"
        x2="11"
        y2="21"
        stroke={color}
        strokeWidth="1"
        opacity="0.5"
      />
      <line
        x1="1"
        y1="11"
        x2="4"
        y2="11"
        stroke={color}
        strokeWidth="1"
        opacity="0.5"
      />
      <line
        x1="18"
        y1="11"
        x2="21"
        y2="11"
        stroke={color}
        strokeWidth="1"
        opacity="0.5"
      />
    </svg>
  );
}

function BarrierIcon({ color }: { color: string }) {
  return (
    <svg
      width="24"
      height="22"
      viewBox="0 0 24 22"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <rect x="3" y="4" width="4" height="15" rx="1" fill={color} />
      <rect
        x="6"
        y="5"
        width="15"
        height="3"
        rx="1"
        fill={color}
        opacity="0.85"
      />
      <circle cx="5" cy="6.5" r="2.5" fill="#080a0e" opacity="0.55" />
      <circle cx="5" cy="6.5" r="1.5" fill={color} opacity="0.9" />
      <path
        d="M9 6.5h3M14 6.5h3"
        stroke="#080a0e"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.65"
      />
      <rect x="1" y="18" width="8" height="2" rx="1" fill={color} />
    </svg>
  );
}

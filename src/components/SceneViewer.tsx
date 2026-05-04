import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  SceneAssets,
  PlacedSensor,
  SensorOccupancy,
  MainCamKey,
} from "../types";
import { useSceneRenderer } from "../hooks/useSceneRenderer";
import { SensorManager } from "../utils/sensorManager";
import { CameraLabel } from "./CameraLabel";
import { HUD } from "./HUD";
import { SensorPanel } from "./SensorPanel";

interface SceneViewerProps {
  assets: SceneAssets;
}
const BOTTOM_H = 160;

// All possible main camera keys in display order
const ALL_MAIN_CAMS: MainCamKey[] = [
  "main",
  "main2",
  "main3",
  "main4",
  "main5",
];

const CAM_DISPLAY_LABELS: Record<MainCamKey, string> = {
  main: "MAIN CAM 1",
  main2: "MAIN CAM 2",
  main3: "MAIN CAM 3",
  main4: "MAIN CAM 4",
  main5: "MAIN CAM 5",
};

export function SceneViewer({ assets }: SceneViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mainViewRef = useRef<HTMLDivElement>(null);
  const subRef0 = useRef<HTMLDivElement>(null);
  const subRef1 = useRef<HTMLDivElement>(null);
  const subRef2 = useRef<HTMLDivElement>(null);
  const subRef3 = useRef<HTMLDivElement>(null);
  const subViewRefs = [subRef0, subRef1, subRef2, subRef3];

  // ── Active main camera ────────────────────────────────────────────────────
  const [activeCam, setActiveCam] = useState<MainCamKey>("main");
  const activeCameraRef = useRef<MainCamKey>("main");

  const switchCamera = (cam: MainCamKey) => {
    activeCameraRef.current = cam;
    setActiveCam(cam);
  };

  // Derive which main cameras actually exist in the loaded GLB
  const availableMainCams = useMemo<MainCamKey[]>(
    () => ALL_MAIN_CAMS.filter((k) => assets.cameras[k] != null),
    [assets.cameras],
  );

  // Keyboard shortcut: 1-5 to switch main cameras
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const digit = parseInt(e.key, 10);
      if (digit >= 1 && digit <= 5) {
        const key = ALL_MAIN_CAMS[digit - 1];
        if (availableMainCams.includes(key)) switchCamera(key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [availableMainCams]);

  // ── Sensor manager ────────────────────────────────────────────────────────
  const sensorManagerRef = useRef<SensorManager | null>(null);
  useEffect(() => {
    sensorManagerRef.current = new SensorManager(assets.sensorMeshes);
  }, [assets.sensorMeshes]);

  const [placedSensors, setPlacedSensors] = useState<PlacedSensor[]>([]);
  const [nextSensorIndex, setNextSensorIndex] = useState(1);
  const [allSensorsPlaced, setAllSensorsPlaced] = useState(false);
  const [occupancy, setOccupancy] = useState<SensorOccupancy[]>([]);
  const [barrierPlaced, setBarrierPlaced] = useState(false);

  const syncSensorState = useCallback(() => {
    const mgr = sensorManagerRef.current;
    if (!mgr) return;
    setPlacedSensors(
      mgr.getPlacedIndices().map((i) => ({ index: i, label: `SENSOR ${i}` })),
    );
    setNextSensorIndex(mgr.nextSensorIndex);
    setAllSensorsPlaced(mgr.allPlaced);
  }, []);

  const handleSensorDrop = useCallback(() => {
    sensorManagerRef.current?.placeNext();
    syncSensorState();
  }, [syncSensorState]);

  const handleSensorRemove = useCallback(
    (index: number) => {
      sensorManagerRef.current?.remove(index);
      setOccupancy((prev) => prev.filter((o) => o.sensorIndex !== index));
      syncSensorState();
    },
    [syncSensorState],
  );

  const handleSensorRemoveAll = useCallback(() => {
    sensorManagerRef.current?.removeAll();
    setOccupancy([]);
    syncSensorState();
  }, [syncSensorState]);

  // ── Anim / HUD state ──────────────────────────────────────────────────────
  const [currentCar, setCurrentCar] = useState(0);
  const [allFinished, setAllFinished] = useState(false);
  const [animSpeed, setAnimSpeed] = useState(1.0);
  const [isPaused, setIsPaused] = useState(false);
  const [isCurrentFinished, setIsCurrentFinished] = useState(false);
  const [carSpeedBoost, setCarSpeedBoost] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerControlEnabled, setPlayerControlEnabled] = useState(false);

  const {
    togglePause,
    fasterCurrent,
    repeatCurrent,
    previousCar,
    nextCar,
    seekTo,
    skipCurrent,
  } = useSceneRenderer({
    assets,
    canvasRef,
    mainViewRef,
    subViewRefs,
    sensorManagerRef,
    activeCameraRef,
    onCarChange: (i) => {
      setCurrentCar(i);
      setIsCurrentFinished(false);
      setIsPaused(false);
      setCarSpeedBoost(1);
      setProgress(0);
    },
    onAllCarsFinished: () => {
      setAllFinished(true);
      setIsCurrentFinished(true);
    },
    onCurrentCarFinished: () => setIsCurrentFinished(true),
    onProgressUpdate: (p, d) => {
      setProgress(p);
      setDuration(d);
    },
    onOccupancyUpdate: setOccupancy,
    onAutoPauseChange: setIsPaused,
    animSpeed,
    playerControlEnabled,
    barrierPlaced,
  });

  const handleTogglePause = () => {
    togglePause();
    setIsPaused((p) => !p);
  };
  const handleFaster = () => {
    fasterCurrent();
    setCarSpeedBoost((b) => Math.min(b + 1, 5));
  };
  const handleRepeat = () => {
    repeatCurrent();
    setIsCurrentFinished(false);
    setIsPaused(false);
    setCarSpeedBoost(1);
    setProgress(0);
  };
  const handlePrevious = () => {
    previousCar();
    setIsCurrentFinished(false);
    setIsPaused(false);
    setCarSpeedBoost(1);
    setProgress(0);
  };
  const handleNext = () => {
    nextCar();
    setIsCurrentFinished(false);
    setIsPaused(false);
    setCarSpeedBoost(1);
    setProgress(0);
  };
  const handleSeek = (time: number) => {
    seekTo(time);
    setProgress(time);
    if (time < duration) setIsCurrentFinished(false);
  };
  const handleBarrierDrop = useCallback(() => {
    if (assets.barrier) setBarrierPlaced(true);
  }, [assets.barrier]);
  const handleBarrierRemove = useCallback(() => {
    if (assets.barrier) {
      assets.barrier.root.visible = false;
      setBarrierPlaced(false);
    }
  }, [assets.barrier]);

  // ── Drag-drop (scene assets) ──────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.getData("text/plain");
    if (dropped === "sensor") handleSensorDrop();
    if (dropped === "barrier") handleBarrierDrop();
  };

  const occupiedCount = occupancy.filter((o) => o.occupied).length;
  const barrierClosed =
    barrierPlaced && occupancy.length > 0 && occupancy.every((o) => o.occupied);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: "#080a0e",
        overflow: "hidden",
      }}
    >
      {/* ── Shared WebGL canvas ──────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />

      {/* ── HUD (top bar + camera switcher) ─────────────────────────────── */}
      <HUD
        currentCar={currentCar}
        totalCars={assets.cars.length}
        allFinished={allFinished}
        isLocked={false}
        speed={animSpeed}
        onSpeedChange={setAnimSpeed}
        isPaused={isPaused}
        isCurrentFinished={isCurrentFinished}
        carSpeedBoost={carSpeedBoost}
        onTogglePause={handleTogglePause}
        onFaster={handleFaster}
        onRepeat={handleRepeat}
        onPrevious={handlePrevious}
        onNext={handleNext}
        progress={progress}
        duration={duration}
        onSeek={handleSeek}
        playerControlEnabled={playerControlEnabled}
        onTogglePlayerControl={() => setPlayerControlEnabled((v) => !v)}
        onSkip={skipCurrent}
        // multi-cam props
        activeCam={activeCam}
        availableMainCams={availableMainCams}
        onSwitchCamera={switchCamera}
      />

      {/* ── MAIN CAMERA VIEWPORT ────────────────────────────────────────── */}
      <div
        ref={mainViewRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: BOTTOM_H,
          border: "1px solid rgba(0,212,255,0.12)",
          pointerEvents: "auto",
        }}
      >
        <CameraLabel label={CAM_DISPLAY_LABELS[activeCam]} isMain isActive />
        <Crosshair />
        <DropHint />

        {/* Occupied-space alert */}
        {occupiedCount > 0 && (
          <div
            style={{
              position: "absolute",
              top: "8px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 30,
              pointerEvents: "none",
              background: "rgba(255,34,68,0.14)",
              border: "1px solid rgba(255,34,68,0.55)",
              borderRadius: "4px",
              padding: "4px 18px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              animation: "alertPulse 1.5s infinite",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#ff2244",
                boxShadow: "0 0 8px #ff2244",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: "0.62rem",
                color: "#ff6b6b",
                letterSpacing: "0.2em",
              }}
            >
              {occupiedCount} SPACE{occupiedCount > 1 ? "S" : ""} OCCUPIED
            </span>
          </div>
        )}

        {/* Keyboard hint — shown when multiple main cams exist */}
        {availableMainCams.length > 1 && (
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              right: "10px",
              pointerEvents: "none",
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.48rem",
              color: "rgba(0,212,255,0.3)",
              letterSpacing: "0.1em",
            }}
          >
            PRESS 1–{availableMainCams.length} TO SWITCH VIEW
          </div>
        )}
      </div>

      {/* ── BOTTOM STRIP ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: BOTTOM_H,
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          gap: "4px",
          padding: "4px",
          background: "rgba(6,8,12,0.92)",
          borderTop: "1px solid #1a2332",
        }}
      >
        {/* cam_in_1 */}
        <div
          ref={subRef0}
          style={{
            flex: 1,
            position: "relative",
            border: "1px solid rgba(26,35,50,0.9)",
            borderRadius: "3px",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <CameraLabel label="CAM / IN-1" isActive />
          <Vignette />
        </div>

        {/* cam_in_2 */}
        <div
          ref={subRef1}
          style={{
            flex: 1,
            position: "relative",
            border: "1px solid rgba(26,35,50,0.9)",
            borderRadius: "3px",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <CameraLabel label="CAM / IN-2" isActive />
          <Vignette />
        </div>

        {/* cam_out_1 */}
        <div
          ref={subRef2}
          style={{
            flex: 1,
            position: "relative",
            border: "1px solid rgba(26,35,50,0.9)",
            borderRadius: "3px",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <CameraLabel label="CAM / OUT-1" isActive />
          <Vignette />
        </div>

        {/* cam_out_2 */}
        <div
          ref={subRef3}
          style={{
            flex: 1,
            position: "relative",
            border: "1px solid rgba(26,35,50,0.9)",
            borderRadius: "3px",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <CameraLabel label="CAM / OUT-2" isActive />
          <Vignette />
        </div>

        <div style={{ flexShrink: 0, width: "4px" }} />

        {/* ── Playback controls ────────────────────────────────────────── */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: "10px",
            paddingRight: "8px",
          }}
        >
          {/* Speed slider */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: "0.55rem",
                color: "#3a5068",
                letterSpacing: "0.1em",
              }}
            >
              SPEED
            </span>
            <input
              type="range"
              min={0.25}
              max={8}
              step={0.25}
              value={animSpeed}
              onChange={(e) => setAnimSpeed(parseFloat(e.target.value))}
              style={{
                width: "120px",
                accentColor: "#ff6b00",
                cursor: "pointer",
              }}
            />
            <span
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: "0.6rem",
                color: "#ff6b00",
                minWidth: "36px",
              }}
            >
              {animSpeed.toFixed(2)}x
            </span>
          </div>

          {/* Car sequence dots */}
          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
            {Array.from({ length: assets.cars.length }, (_, i) => (
              <div
                key={i}
                style={{
                  width: i === currentCar && !allFinished ? "18px" : "5px",
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
                      ? "0 0 5px rgba(0,212,255,0.6)"
                      : i === currentCar && !allFinished
                        ? "0 0 5px rgba(255,107,0,0.6)"
                        : "none",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>

          {/* Transport buttons */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <CtrlBtn
              onClick={handlePrevious}
              disabled={currentCar === 0}
              title="Previous car"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <polygon points="14,2 6,8 14,14" />
                <polygon points="8,2 0,8 8,14" />
              </svg>
            </CtrlBtn>

            <CtrlBtn
              onClick={
                allFinished || isCurrentFinished
                  ? handleRepeat
                  : handleTogglePause
              }
              primary
              title={
                allFinished || isCurrentFinished
                  ? "Repeat"
                  : isPaused
                    ? "Play"
                    : "Pause"
              }
            >
              {allFinished || isCurrentFinished ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="currentColor"
                >
                  <path d="M9 2a7 7 0 1 0 5.2 2.3L13 5.5A5.5 5.5 0 1 1 9 3.5V2z" />
                  <polygon points="7,0 13,3 7,6" />
                </svg>
              ) : isPaused ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="currentColor"
                >
                  <polygon points="4,2 16,9 4,16" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="currentColor"
                >
                  <rect x="3" y="2" width="4" height="14" />
                  <rect x="11" y="2" width="4" height="14" />
                </svg>
              )}
            </CtrlBtn>

            <CtrlBtn
              onClick={allFinished ? undefined : handleNext}
              disabled={allFinished || currentCar >= assets.cars.length - 1}
              title="Next car"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <polygon points="2,2 10,8 2,14" />
                <polygon points="8,2 16,8 8,14" />
              </svg>
            </CtrlBtn>

            <div
              style={{
                width: "1px",
                height: "24px",
                background: "#1a2332",
                margin: "0 2px",
              }}
            />

            <CtrlBtn
              onClick={skipCurrent}
              disabled={allFinished || isCurrentFinished}
              title="Skip current"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <polygon points="1,2 11,8 1,14" />
                <rect x="12" y="2" width="3" height="12" />
              </svg>
            </CtrlBtn>
          </div>

          {/* Status label */}
          <div
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: "0.55rem",
              color: "#3a5068",
              letterSpacing: "0.12em",
            }}
          >
            {allFinished ? (
              <span style={{ color: "#00ff88" }}>ALL COMPLETE</span>
            ) : (
              <span>
                CAR <span style={{ color: "#ff6b00" }}>{currentCar + 1}</span>/
                {assets.cars.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── SENSOR PANEL ──────────────────────────────────────────────────── */}
      <SensorPanel
        nextIndex={nextSensorIndex}
        totalSensors={assets.sensorMeshes.length}
        placedSensors={placedSensors}
        occupancy={occupancy}
        allPlaced={allSensorsPlaced}
        barrierAvailable={assets.barrier != null}
        barrierPlaced={barrierPlaced}
        barrierClosed={barrierClosed}
        onRemove={handleSensorRemove}
        onRemoveAll={handleSensorRemoveAll}
        onBarrierDrop={handleBarrierDrop}
        onBarrierRemove={handleBarrierRemove}
      />

      <style>{`
        @keyframes alertPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
      `}</style>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Vignette() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(ellipse at center, transparent 80%, rgba(0,0,0,0.2) 100%)",
        borderRadius: "3px",
        pointerEvents: "none",
      }}
    />
  );
}

function Crosshair() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20">
        <line
          x1="10"
          y1="2"
          x2="10"
          y2="8"
          stroke="rgba(0,212,255,0.35)"
          strokeWidth="1"
        />
        <line
          x1="10"
          y1="12"
          x2="10"
          y2="18"
          stroke="rgba(0,212,255,0.35)"
          strokeWidth="1"
        />
        <line
          x1="2"
          y1="10"
          x2="8"
          y2="10"
          stroke="rgba(0,212,255,0.35)"
          strokeWidth="1"
        />
        <line
          x1="12"
          y1="10"
          x2="18"
          y2="10"
          stroke="rgba(0,212,255,0.35)"
          strokeWidth="1"
        />
        <circle cx="10" cy="10" r="1.5" fill="rgba(0,212,255,0.5)" />
      </svg>
    </div>
  );
}

function DropHint() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const show = () => setActive(true);
    const hide = () => setActive(false);
    window.addEventListener("dragstart", show);
    window.addEventListener("dragend", hide);
    return () => {
      window.removeEventListener("dragstart", show);
      window.removeEventListener("dragend", hide);
    };
  }, []);
  if (!active) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        border: "2px dashed rgba(0,212,255,0.45)",
        borderRadius: "2px",
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "rgba(8,10,14,0.78)",
          border: "1px solid rgba(0,212,255,0.3)",
          borderRadius: "4px",
          padding: "8px 18px",
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: "0.7rem",
          color: "#00d4ff",
          letterSpacing: "0.2em",
        }}
      >
        DROP TO PLACE ASSET
      </div>
    </div>
  );
}

interface CtrlBtnProps {
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
  title?: string;
  children: React.ReactNode;
}
function CtrlBtn({
  onClick,
  disabled = false,
  primary = false,
  title,
  children,
}: CtrlBtnProps) {
  const size = primary ? 48 : 36;
  const col = disabled ? "#2a3a4a" : primary ? "#00d4ff" : "#7a8fa6";
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        background:
          primary && !disabled ? "rgba(0,212,255,0.08)" : "transparent",
        border: `1px solid ${disabled ? "#1a2332" : primary ? "rgba(0,212,255,0.4)" : "rgba(122,143,166,0.3)"}`,
        color: col,
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.15s",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = primary
            ? "rgba(0,212,255,0.18)"
            : "rgba(122,143,166,0.1)";
          e.currentTarget.style.borderColor = primary
            ? "rgba(0,212,255,0.7)"
            : "rgba(122,143,166,0.6)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background =
          primary && !disabled ? "rgba(0,212,255,0.08)" : "transparent";
        e.currentTarget.style.borderColor = disabled
          ? "#1a2332"
          : primary
            ? "rgba(0,212,255,0.4)"
            : "rgba(122,143,166,0.3)";
      }}
    >
      {children}
    </button>
  );
}

import React, { useRef, useState, useEffect, useCallback } from "react";
import { SceneAssets, PlacedSensor, SensorOccupancy } from "../types";
import { useSceneRenderer } from "../hooks/useSceneRenderer";
import { SensorManager } from "../utils/sensorManager";
import { CameraLabel } from "./CameraLabel";
import { HUD } from "./HUD";
import { SensorPanel } from "./SensorPanel";

interface SceneViewerProps {
  assets: SceneAssets;
}

export function SceneViewer({ assets }: SceneViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mainViewRef = useRef<HTMLDivElement>(null);
  const subRef0 = useRef<HTMLDivElement>(null);
  const subRef1 = useRef<HTMLDivElement>(null);
  const subRef2 = useRef<HTMLDivElement>(null);
  const subRef3 = useRef<HTMLDivElement>(null);
  const subViewRefs = [subRef0, subRef1, subRef2, subRef3];

  // ── Sensor manager ────────────────────────────────────────────────────────
  const sensorManagerRef = useRef<SensorManager | null>(null);
  useEffect(() => {
    sensorManagerRef.current = new SensorManager(assets.sensorMeshes);
  }, [assets.sensorMeshes]);

  // ── Sensor UI state ───────────────────────────────────────────────────────
  const [placedSensors, setPlacedSensors] = useState<PlacedSensor[]>([]);
  const [nextSensorIndex, setNextSensorIndex] = useState(1);
  const [allSensorsPlaced, setAllSensorsPlaced] = useState(false);
  const [occupancy, setOccupancy] = useState<SensorOccupancy[]>([]);

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

  // ── Animation / HUD state ─────────────────────────────────────────────────
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
  } = useSceneRenderer({
    assets,
    canvasRef,
    mainViewRef,
    subViewRefs,
    sensorManagerRef,
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
    animSpeed,
    playerControlEnabled,
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

  // ── Drag-drop ─────────────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.getData("text/plain") === "sensor") handleSensorDrop();
  };

  const occupiedCount = occupancy.filter((o) => o.occupied).length;

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
      {/* Shared WebGL canvas */}
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

      {/* Occupied alert bar */}
      {occupiedCount > 0 && (
        <div
          style={{
            position: "absolute",
            top: "36px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
            pointerEvents: "none",
            background: "rgba(255,34,68,0.12)",
            border: "1px solid rgba(255,34,68,0.5)",
            borderRadius: "4px",
            padding: "4px 16px",
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

      {/* Viewport grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          gridTemplateColumns: "200px 1fr 200px",
          gridTemplateRows: "1fr 1fr",
          gap: "3px",
          padding: "40px 8px 90px 8px",
          pointerEvents: "none",
        }}
      >
        <ViewportCell ref={subRef0} label="CAM / IN-1" />
        <ViewportCell ref={subRef1} label="CAM / IN-2" gridRow="2" />

        {/* MAIN CAM */}
        <div
          ref={mainViewRef}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            gridColumn: "2",
            gridRow: "1 / 3",
            position: "relative",
            border: "1px solid rgba(0,212,255,0.15)",
            borderRadius: "4px",
            boxShadow: "inset 0 0 20px rgba(0,0,0,0.3)",
            pointerEvents: "auto",
          }}
        >
          <CameraLabel label="MAIN CAM" isMain isActive />
          <Crosshair />
          <DropHint />
        </div>

        <ViewportCell ref={subRef2} label="CAM / OUT-1" gridCol="3" />
        <ViewportCell
          ref={subRef3}
          label="CAM / OUT-2"
          gridCol="3"
          gridRow="2"
        />
      </div>

      {/* Sensor panel */}
      <SensorPanel
        nextIndex={nextSensorIndex}
        totalSensors={assets.sensorMeshes.length}
        placedSensors={placedSensors}
        occupancy={occupancy}
        allPlaced={allSensorsPlaced}
        onDrop={handleSensorDrop}
        onRemove={handleSensorRemove}
        onRemoveAll={handleSensorRemoveAll}
        mainViewRef={mainViewRef}
      />

      {/* HUD */}
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
      />

      <style>{`
        @keyframes alertPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ViewportCell = React.forwardRef<
  HTMLDivElement,
  { label: string; gridCol?: string; gridRow?: string }
>(({ label, gridCol = "1", gridRow = "1" }, ref) => (
  <div
    ref={ref}
    style={{
      gridColumn: gridCol,
      gridRow,
      position: "relative",
      border: "1px solid rgba(26,35,50,0.8)",
      borderRadius: "3px",
      background: "rgba(8,10,14,0.5)",
    }}
  >
    <CameraLabel label={label} isActive />
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(ellipse at center, transparent 60%, rgba(8,10,14,0.4) 100%)",
        borderRadius: "3px",
        pointerEvents: "none",
      }}
    />
  </div>
));
ViewportCell.displayName = "ViewportCell";

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
          stroke="rgba(0,212,255,0.4)"
          strokeWidth="1"
        />
        <line
          x1="10"
          y1="12"
          x2="10"
          y2="18"
          stroke="rgba(0,212,255,0.4)"
          strokeWidth="1"
        />
        <line
          x1="2"
          y1="10"
          x2="8"
          y2="10"
          stroke="rgba(0,212,255,0.4)"
          strokeWidth="1"
        />
        <line
          x1="12"
          y1="10"
          x2="18"
          y2="10"
          stroke="rgba(0,212,255,0.4)"
          strokeWidth="1"
        />
        <circle cx="10" cy="10" r="1.5" fill="rgba(0,212,255,0.6)" />
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
        border: "2px dashed rgba(0,212,255,0.5)",
        borderRadius: "4px",
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "rgba(8,10,14,0.75)",
          border: "1px solid rgba(0,212,255,0.3)",
          borderRadius: "4px",
          padding: "8px 16px",
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: "0.7rem",
          color: "#00d4ff",
          letterSpacing: "0.2em",
          pointerEvents: "none",
        }}
      >
        DROP TO PLACE SENSOR
      </div>
    </div>
  );
}

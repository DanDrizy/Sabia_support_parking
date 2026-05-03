import React, { useRef, useState } from "react";
import { SceneAssets } from "../types";
import { useSceneRenderer } from "../hooks/useSceneRenderer";
import { CameraLabel } from "./CameraLabel";
import { HUD } from "./HUD";

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
    skipCurrent,
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
    onCurrentCarFinished: () => {
      setIsCurrentFinished(true);
    },
    onProgressUpdate: (p, d) => {
      setProgress(p);
      setDuration(d);
    },
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

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          gridTemplateColumns: "200px 1fr 200px",
          gridTemplateRows: "1fr 1fr",
          gap: "3px",
          padding: "40px 8px 28px 8px",
          pointerEvents: "none",
        }}
      >
        <div
          ref={subRef0}
          style={{
            gridColumn: "1",
            gridRow: "1",
            position: "relative",
            border: "1px solid rgba(26,35,50,0.8)",
            borderRadius: "3px",
            background: "rgba(8,10,14,0.5)",
          }}
        >
          <CameraLabel label="CAM / IN-1" isActive />
          <Vignette />
        </div>

        <div
          ref={subRef1}
          style={{
            gridColumn: "1",
            gridRow: "2",
            position: "relative",
            border: "1px solid rgba(26,35,50,0.8)",
            borderRadius: "3px",
            background: "rgba(8,10,14,0.5)",
          }}
        >
          <CameraLabel label="CAM / IN-2" isActive />
          <Vignette />
        </div>

        <div
          ref={mainViewRef}
          style={{
            gridColumn: "2",
            gridRow: "1 / 3",
            position: "relative",
            border: "1px solid rgba(0,212,255,0.15)",
            borderRadius: "4px",
            boxShadow: "inset 0 0 20px rgba(0,0,0,0.3)",
          }}
        >
          <CameraLabel label="MAIN CAM" isMain isActive />
        </div>

        <div
          ref={subRef2}
          style={{
            gridColumn: "3",
            gridRow: "1",
            position: "relative",
            border: "1px solid rgba(26,35,50,0.8)",
            borderRadius: "3px",
            background: "rgba(8,10,14,0.5)",
          }}
        >
          <CameraLabel label="CAM / OUT-1" isActive />
          <Vignette />
        </div>

        <div
          ref={subRef3}
          style={{
            gridColumn: "3",
            gridRow: "2",
            position: "relative",
            border: "1px solid rgba(26,35,50,0.8)",
            borderRadius: "3px",
            background: "rgba(8,10,14,0.5)",
          }}
        >
          <CameraLabel label="CAM / OUT-2" isActive />
          <Vignette />
        </div>
      </div>

      <HUD
        currentCar={currentCar}
        totalCars={assets.cars.length}
        allFinished={allFinished}
        isLocked={false}
        speed={animSpeed}
        onSpeedChange={setAnimSpeed}
        onSkip={skipCurrent}
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
        onTogglePlayerControl={() =>
          setPlayerControlEnabled((v) => !v)
        }
      />
    </div>
  );
}

function Vignette() {
  return (
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
  );
}
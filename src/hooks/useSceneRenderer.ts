import { useEffect, useRef, useCallback, RefObject } from "react";
import * as THREE from "three";
import { SceneAssets, SensorOccupancy } from "../types";
import { CarAnimationSequencer } from "../utils/carSequencer";
import { SensorManager } from "../utils/sensorManager";
import { usePlayerController } from "./usePlayerController";

export const MAIN_CAMERA_START = { x: 0, y: 1.75, z: 5 };

const OCCUPANCY_UPDATE_INTERVAL_MS = 100;

interface UseSceneRendererOptions {
  assets: SceneAssets | null;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  mainViewRef: RefObject<HTMLDivElement | null>;
  subViewRefs: RefObject<HTMLDivElement | null>[];
  sensorManagerRef: React.RefObject<SensorManager | null>;
  onCarChange?: (index: number) => void;
  onAllCarsFinished?: () => void;
  onCurrentCarFinished?: () => void;
  onProgressUpdate?: (progress: number, duration: number) => void;
  onOccupancyUpdate?: (occupancy: SensorOccupancy[]) => void;
  animSpeed?: number;
  playerControlEnabled?: boolean;
}

export function useSceneRenderer({
  assets,
  canvasRef,
  mainViewRef,
  subViewRefs,
  sensorManagerRef,
  onCarChange,
  onAllCarsFinished,
  onCurrentCarFinished,
  onProgressUpdate,
  onOccupancyUpdate,
  animSpeed = 1.0,
  playerControlEnabled = false,
}: UseSceneRendererOptions) {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const sequencerRef = useRef<CarAnimationSequencer | null>(null);
  const animFrameRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());

  const animSpeedRef = useRef(animSpeed);
  const playerEnabledRef = useRef(playerControlEnabled);
  const onOccupancyRef = useRef(onOccupancyUpdate);

  useEffect(() => { animSpeedRef.current = animSpeed; }, [animSpeed]);
  useEffect(() => { playerEnabledRef.current = playerControlEnabled; }, [playerControlEnabled]);
  useEffect(() => { onOccupancyRef.current = onOccupancyUpdate; }, [onOccupancyUpdate]);

  const fallbackCamRef = useRef<THREE.PerspectiveCamera>(
    new THREE.PerspectiveCamera(60, 1, 0.1, 1000),
  );

  const getMainCamera = useCallback((): THREE.Camera => {
    return assets?.cameras.main ?? fallbackCamRef.current;
  }, [assets]);

  const playerCtrl = usePlayerController({
    camera: assets?.cameras.main ?? fallbackCamRef.current,
    collisionMeshes: [],
    enabled: !!assets && playerControlEnabled,
    canvasEl: canvasRef.current,
  });

  useEffect(() => {
    if (!assets || !canvasRef.current) return;

    console.log("[useSceneRenderer] cameras:", {
      main: assets.cameras.main?.name  ?? "MISSING",
      in1:  assets.cameras.in1?.name   ?? "MISSING",
      in2:  assets.cameras.in2?.name   ?? "MISSING",
      out1: assets.cameras.out1?.name  ?? "MISSING",
      out2: assets.cameras.out2?.name  ?? "MISSING",
    });

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;

    // ── Scene ─────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    if (assets.hdriTexture) {
      scene.background = assets.hdriTexture;
      scene.environment = assets.hdriTexture;
    } else {
      scene.background = new THREE.Color(0x080a0e);
      scene.fog = new THREE.Fog(0x080a0e, 80, 200);
    }
    sceneRef.current = scene;

    scene.add(new THREE.AmbientLight(0x8899bb, 0.4));
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.5);
    sun.position.set(50, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 300;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x4466aa, 0.3);
    fill.position.set(-30, 20, -50);
    scene.add(fill);

    // Add environment (sensors are already children of environment from loader)
    scene.add(assets.environment);

    // Add cars to scene
    assets.cars.forEach((car) => scene.add(car));

    // Force full world matrix update now that everything is in the scene
    scene.updateWorldMatrix(true, true);

    // Fallback camera position
    fallbackCamRef.current.position.set(
      MAIN_CAMERA_START.x,
      MAIN_CAMERA_START.y,
      MAIN_CAMERA_START.z,
    );

    // ── Car sequencer ─────────────────────────────────────────────────────────
    const sequencer = new CarAnimationSequencer(
      assets.carMixers,
      assets.carClips,
      () => onAllCarsFinished?.(),
      (i) => onCarChange?.(i),
      () => onCurrentCarFinished?.(),
      (p, d) => onProgressUpdate?.(p, d),
    );
    sequencer.start();
    sequencerRef.current = sequencer;

    const clock = clockRef.current;
    clock.start();
    let lastCarIndex = 0;
    let lastOccupancyPushMs = 0;

    function renderViewport(
      cam: THREE.Camera | null,
      domEl: HTMLDivElement | null,
      canvasEl: HTMLCanvasElement,
    ) {
      if (!cam || !domEl) return;
      const rect = domEl.getBoundingClientRect();
      const canvasRect = canvasEl.getBoundingClientRect();
      const left = rect.left - canvasRect.left;
      const bottom = canvasRect.bottom - rect.bottom;
      const width = rect.width;
      const height = rect.height;
      if (width <= 0 || height <= 0) return;
      renderer.setViewport(left, bottom, width, height);
      renderer.setScissor(left, bottom, width, height);
      renderer.setScissorTest(true);
      if ((cam as THREE.PerspectiveCamera).isPerspectiveCamera) {
        const pcam = cam as THREE.PerspectiveCamera;
        pcam.aspect = width / height;
        pcam.updateProjectionMatrix();
      }
      renderer.render(scene, cam);
    }

    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);
      const rawDt = Math.min(clock.getDelta(), 0.05);
      const dt = rawDt * animSpeedRef.current;

      // ── Update animations ────────────────────────────────────────────────
      sequencer.update(dt);

      const ci = sequencer.getCurrentCarIndex();
      if (ci !== lastCarIndex) {
        lastCarIndex = ci;
        onCarChange?.(ci);
      }

      if (playerEnabledRef.current) playerCtrl.update(rawDt);

      // ── Update all car world matrices BEFORE sensor tick ─────────────────
      // This is critical — animation changes positions, we must resolve matrices
      // before raycasting or the sensor will test against stale positions.
      assets!.cars.forEach((car) => car.updateWorldMatrix(true, true));

      // ── Sensor tick ──────────────────────────────────────────────────────
      const mgr = sensorManagerRef.current;
      if (mgr) {
        const occupancy = mgr.tick(assets!.cars);
        const nowMs = performance.now();
        if (
          nowMs - lastOccupancyPushMs > OCCUPANCY_UPDATE_INTERVAL_MS &&
          onOccupancyRef.current
        ) {
          onOccupancyRef.current(occupancy);
          lastOccupancyPushMs = nowMs;
        }
      }

      // ── Resize + render ──────────────────────────────────────────────────
      const canvas = canvasRef.current!;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h)
        renderer.setSize(w, h, false);

      renderer.setClearColor(0x080a0e, 1);
      renderViewport(getMainCamera(), mainViewRef.current, canvas);

      const subCams: (THREE.Camera | null)[] = [
        assets!.cameras.in1,
        assets!.cameras.in2,
        assets!.cameras.out1,
        assets!.cameras.out2,
      ];
      subViewRefs.forEach((ref, i) =>
        renderViewport(subCams[i], ref.current, canvas),
      );
    }

    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      rendererRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  const skipCurrent   = () => sequencerRef.current?.skipCurrent();
  const togglePause   = () => sequencerRef.current?.togglePause();
  const fasterCurrent = () => sequencerRef.current?.fasterCurrent();
  const repeatCurrent = () => sequencerRef.current?.repeatCurrent();
  const previousCar   = () => sequencerRef.current?.previousCar();
  const nextCar       = () => sequencerRef.current?.nextCar();
  const seekTo        = (time: number) => sequencerRef.current?.seekTo(time);

  return {
    sequencerRef,
    skipCurrent,
    togglePause,
    fasterCurrent,
    repeatCurrent,
    previousCar,
    nextCar,
    seekTo,
  };
}
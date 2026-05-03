import { useEffect, useRef, useCallback, RefObject } from "react";
import * as THREE from "three";
import { SceneAssets } from "../types";
import { CarAnimationSequencer } from "../utils/carSequencer";
import { usePlayerController } from "./usePlayerController";

interface UseSceneRendererOptions {
  assets: SceneAssets | null;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  mainViewRef: RefObject<HTMLDivElement | null>;
  subViewRefs: RefObject<HTMLDivElement | null>[];
  onCarChange?: (index: number) => void;
  onAllCarsFinished?: () => void;
  onCurrentCarFinished?: () => void;
  onProgressUpdate?: (progress: number, duration: number) => void;
  animSpeed?: number;
  playerControlEnabled?: boolean;
}

export function useSceneRenderer({
  assets,
  canvasRef,
  mainViewRef,
  subViewRefs,
  onCarChange,
  onAllCarsFinished,
  onCurrentCarFinished,
  onProgressUpdate,
  animSpeed = 1.0,
  playerControlEnabled = false,
}: UseSceneRendererOptions) {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const sequencerRef = useRef<CarAnimationSequencer | null>(null);
  const animFrameRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());

  const animSpeedRef = useRef(animSpeed);
  useEffect(() => {
    animSpeedRef.current = animSpeed;
  }, [animSpeed]);

  const playerControlEnabledRef = useRef(playerControlEnabled);
  useEffect(() => {
    playerControlEnabledRef.current = playerControlEnabled;
  }, [playerControlEnabled]);

  const fallbackCamRef = useRef<THREE.PerspectiveCamera>(
    new THREE.PerspectiveCamera(60, 1, 0.1, 1000),
  );

  const playerCtrl = usePlayerController({
    camera: assets?.cameras.main ?? fallbackCamRef.current,
    collisionMeshes: [],
    enabled: !!assets && playerControlEnabled,
    canvasEl: canvasRef.current,
  });

  const getMainCamera = useCallback((): THREE.Camera => {
    return assets?.cameras.main ?? fallbackCamRef.current;
  }, [assets]);

  useEffect(() => {
    if (!assets || !canvasRef.current) return;

    console.log(
      "[useSceneRenderer] cameras loaded:",
      Object.keys(assets.cameras),
    );

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

    const scene = new THREE.Scene();

    // ── HDRI sky ─────────────────────────────────────────────────────────────
    if (assets.hdriTexture) {
      scene.background = assets.hdriTexture;
      scene.environment = assets.hdriTexture;
    } else {
      scene.background = new THREE.Color(0x080a0e);
      scene.fog = new THREE.Fog(0x080a0e, 80, 200);
    }

    sceneRef.current = scene;

    const ambient = new THREE.AmbientLight(0x8899bb, 0.4);
    scene.add(ambient);

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

    scene.add(assets.environment);
    assets.cars.forEach((car) => scene.add(car));

    fallbackCamRef.current.position.set(0, 3, 12);
    fallbackCamRef.current.lookAt(0, 1, 0);

    const sequencer = new CarAnimationSequencer(
      assets.carMixers,
      assets.carClips,
      () => onAllCarsFinished?.(),
      (i) => onCarChange?.(i),
      () => onCurrentCarFinished?.(),
      (progress, duration) => onProgressUpdate?.(progress, duration),
    );
    sequencer.start();
    sequencerRef.current = sequencer;

    const clock = clockRef.current;
    clock.start();

    let lastCarIndex = 0;

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

      sequencer.update(dt);

      const ci = sequencer.getCurrentCarIndex();
      if (ci !== lastCarIndex) {
        lastCarIndex = ci;
        onCarChange?.(ci);
      }

      // Only move camera if player control is active
      if (playerControlEnabledRef.current) {
        playerCtrl.update(rawDt);
      }

      const canvas = canvasRef.current!;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        renderer.setSize(w, h, false);
      }

      renderer.setClearColor(0x080a0e, 1);
      renderViewport(getMainCamera(), mainViewRef.current, canvas);

      const subCams: (THREE.Camera | null)[] = [
        assets!.cameras.in1,
        assets!.cameras.in2,
        assets!.cameras.out1,
        assets!.cameras.out2,
      ];
      subViewRefs.forEach((ref, i) => {
        renderViewport(subCams[i], ref.current, canvas);
      });
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

  const skipCurrent = () => sequencerRef.current?.skipCurrent();
  const togglePause = () => sequencerRef.current?.togglePause();
  const fasterCurrent = () => sequencerRef.current?.fasterCurrent();
  const repeatCurrent = () => sequencerRef.current?.repeatCurrent();
  const previousCar = () => sequencerRef.current?.previousCar();
  const nextCar = () => sequencerRef.current?.nextCar();
  const seekTo = (time: number) => sequencerRef.current?.seekTo(time);

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
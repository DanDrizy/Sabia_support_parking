import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { SceneAssets, SensorMeshData } from "../types";

const loader = new GLTFLoader();

async function loadGLB(
  path: string,
): Promise<import("three/examples/jsm/loaders/GLTFLoader.js").GLTF> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(
      `Could not load "${path}" — server returned ${res.status} ${res.statusText}.\n` +
        `Make sure the file exists in your project's public/models/ folder.`,
    );
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    throw new Error(
      `"${path}" returned HTML instead of a GLB file.\n` +
        `The file is missing from public/models/ — copy it there and restart the dev server.`,
    );
  }
  const buffer = await res.arrayBuffer();
  return new Promise((resolve, reject) => {
    loader.parse(buffer, "", resolve, (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      reject(new Error(`GLTFLoader failed to parse "${path}": ${msg}`));
    });
  });
}

async function loadHDRI(path: string): Promise<THREE.DataTexture> {
  return new Promise((resolve, reject) => {
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(
      path,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        resolve(texture);
      },
      undefined,
      (err) => {
        reject(
          new Error(
            `RGBELoader failed to load "${path}": ${err instanceof Error ? err.message : String(err)}\n` +
              `Make sure sky.hdr exists in your project's public/ folder.`,
          ),
        );
      },
    );
  });
}

function collectMeshes(
  obj: THREE.Object3D,
  out: THREE.Mesh[] = [],
): THREE.Mesh[] {
  if ((obj as THREE.Mesh).isMesh) out.push(obj as THREE.Mesh);
  for (const child of obj.children) collectMeshes(child, out);
  return out;
}

function pickCamera(
  gltfCams: THREE.Camera[],
  ...candidates: string[]
): THREE.Camera | null {
  for (const name of candidates) {
    const exact = gltfCams.find((c) => c.name === name);
    if (exact) return exact;
  }
  for (const name of candidates) {
    const partial = gltfCams.find((c) =>
      c.name.toLowerCase().includes(name.toLowerCase()),
    );
    if (partial) return partial;
  }
  return null;
}

function debugNames(root: THREE.Object3D, label: string) {
  const names: string[] = [];
  root.traverse((obj) => {
    if (obj.name) names.push(`${obj.type}: "${obj.name}"`);
  });
  console.groupCollapsed(`[SceneLoader] ${label} — ${names.length} objects`);
  names.forEach((n) => console.log(n));
  console.groupEnd();
}

export async function loadAllAssets(
  onProgress?: (msg: string, pct: number) => void,
): Promise<SceneAssets> {
  const CAR_COUNT = 8;
  const SENSOR_COUNT = 8;
  const report = (msg: string, pct: number) => onProgress?.(msg, pct);

  // ── HDRI sky ──────────────────────────────────────────────────────────────
  report("Loading sky…", 3);
  let hdriTexture: THREE.DataTexture | null = null;
  try {
    hdriTexture = await loadHDRI("/sky.hdr");
  } catch (err) {
    console.warn("[SceneLoader] sky.hdr not found — using solid colour.", err);
  }

  // ── Environment ───────────────────────────────────────────────────────────
  report("Loading environment…", 8);
  const envGLTF = await loadGLB("/models/env.glb");
  const environment = envGLTF.scene;
  environment.name = "environment";
  debugNames(environment, "env.glb");
  environment.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  const collisionMeshes = collectMeshes(environment);
  console.log(`[SceneLoader] Collision meshes: ${collisionMeshes.length}`);

  // ── Cameras ───────────────────────────────────────────────────────────────
  report("Loading cameras…", 18);
  const camGLTF = await loadGLB("/models/camera.glb");
  const camRoot = camGLTF.scene;
  debugNames(camRoot, "camera.glb");
  const gltfCams = camGLTF.cameras;
  console.log(
    "[SceneLoader] gltf.cameras:",
    gltfCams.map((c) => ({ name: c.name, type: c.type })),
  );

  const cameras = {
    main:  pickCamera(gltfCams, "main_camera",   "main"),
    main2: pickCamera(gltfCams, "main_camera_2",  "main2", "MainCamera2"),
    main3: pickCamera(gltfCams, "main_camera_3",  "main3", "MainCamera3"),
    main4: pickCamera(gltfCams, "main_camera_4",  "main4", "MainCamera4"),
    main5: pickCamera(gltfCams, "main_camera_5",  "main5", "MainCamera5"),
    in1:   pickCamera(gltfCams, "camera_in_1",    "in_1",  "in1"),
    in2:   pickCamera(gltfCams, "camera_in_2",    "in_2",  "in2"),
    out1:  pickCamera(gltfCams, "camera_out_1",   "out_1", "out1"),
    out2:  pickCamera(gltfCams, "camera_out_2",   "out_2", "out2"),
  };

  console.log("[SceneLoader] Resolved cameras:", {
    main:  cameras.main?.name  ?? "❌ MISSING",
    main2: cameras.main2?.name ?? "❌ MISSING (optional)",
    main3: cameras.main3?.name ?? "❌ MISSING (optional)",
    main4: cameras.main4?.name ?? "❌ MISSING (optional)",
    main5: cameras.main5?.name ?? "❌ MISSING (optional)",
    in1:   cameras.in1?.name   ?? "❌ MISSING",
    in2:   cameras.in2?.name   ?? "❌ MISSING",
    out1:  cameras.out1?.name  ?? "❌ MISSING",
    out2:  cameras.out2?.name  ?? "❌ MISSING",
  });

  (["main", "in1", "in2", "out1", "out2"] as const).forEach((key) => {
    if (!cameras[key]) {
      console.warn(
        `[SceneLoader] Camera "${key}" is MISSING. Available: ${gltfCams.map((c) => c.name).join(", ")}`,
      );
    }
  });

  camRoot.updateWorldMatrix(true, true);

  // ── Sensors ───────────────────────────────────────────────────────────────
  report("Loading sensors…", 22);
  const sensorMeshes: SensorMeshData[] = [];
  try {
    const sensorGLTF = await loadGLB("/models/sensors.glb");
    const sensorRoot = sensorGLTF.scene;
    debugNames(sensorRoot, "sensors.glb");
    sensorRoot.updateWorldMatrix(true, true);

    for (let i = 1; i <= SENSOR_COUNT; i++) {
      let found: THREE.Mesh | null = null;
      sensorRoot.traverse((obj) => {
        if (found) return;
        if (
          (obj as THREE.Mesh).isMesh &&
          obj.name.toLowerCase() === `sensor_${i}`
        ) {
          found = obj as THREE.Mesh;
        }
      });
      if (!found) {
        sensorRoot.traverse((obj) => {
          if (found) return;
          if (
            (obj as THREE.Mesh).isMesh &&
            obj.name.toLowerCase().includes(`sensor_${i}`)
          ) {
            found = obj as THREE.Mesh;
          }
        });
      }

      if (found) {
        const mesh = found as THREE.Mesh;
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);
        mesh.visible = false;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        sensorMeshes.push({ index: i, mesh, worldPosition: worldPos.clone() });
        console.log(
          `[SceneLoader] sensor_${i} found at world pos`,
          worldPos.toArray().map((v) => v.toFixed(2)),
        );
      } else {
        console.warn(`[SceneLoader] sensor_${i} NOT FOUND in sensors.glb`);
      }
    }

    environment.add(sensorRoot);
  } catch (err) {
    console.warn(
      "[SceneLoader] sensors.glb failed to load — sensor feature disabled.",
      err,
    );
  }

  // ── Cars ──────────────────────────────────────────────────────────────────
  const cars: THREE.Group[] = [];
  const carMixers: THREE.AnimationMixer[] = [];
  const carClips: THREE.AnimationClip[][] = [];

  for (let i = 1; i <= CAR_COUNT; i++) {
    report(`Loading car ${i} of ${CAR_COUNT}…`, 25 + (i / CAR_COUNT) * 68);
    const gltf = await loadGLB(`/models/car_${i}.glb`);
    const group = gltf.scene;
    group.name = `car_${i}`;
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    console.log(
      `[SceneLoader] car_${i}.glb — animations:`,
      gltf.animations.map((a) => a.name).join(", ") || "none",
    );
    const mixer = new THREE.AnimationMixer(group);
    cars.push(group);
    carMixers.push(mixer);
    carClips.push(gltf.animations);
  }

  report("Scene ready", 100);

  return {
    environment,
    cars,
    carMixers,
    carClips,
    cameras,
    collisionMeshes,
    hdriTexture,
    sensorMeshes,
  };
}
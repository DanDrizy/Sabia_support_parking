import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import {
  type BarrierAsset,
  type SceneAssets,
  type SensorMeshData,
} from "../types";

const loader = new GLTFLoader();
const PLATE_PATTERN = /\bRAB\d{3}\b/i;
const CAPTURE_PLATE_CAMERA_ZOOM = 1.0;

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

function pickBarrierPivot(root: THREE.Group): THREE.Object3D {
  if (root.children.length === 1) return root.children[0];

  const namedCandidates: THREE.Object3D[] = [];
  const meshCandidates: THREE.Mesh[] = [];

  root.traverse((obj) => {
    if (obj === root) return;
    const name = obj.name.toLowerCase();
    if (name.includes("barrier") || name.includes("gate") || name.includes("arm")) {
      namedCandidates.push(obj);
    }
    if ((obj as THREE.Mesh).isMesh) meshCandidates.push(obj as THREE.Mesh);
  });

  const namedMesh = namedCandidates.find((obj) => (obj as THREE.Mesh).isMesh);
  if (namedMesh) return namedMesh;
  if (namedCandidates.length > 0) return namedCandidates[0];

  let largestMesh: THREE.Mesh | null = null;
  let largestVolume = -1;
  for (const mesh of meshCandidates) {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const volume = size.x * size.y * size.z;
    if (volume > largestVolume) {
      largestVolume = volume;
      largestMesh = mesh;
    }
  }

  return largestMesh ?? root;
}

function readPlateFromModel(root: THREE.Object3D, fallback: string): string {
  let plate: string | null = null;
  root.traverse((obj) => {
    if (plate) return;
    const match = obj.name.match(PLATE_PATTERN);
    if (match) plate = match[0].toUpperCase();
  });
  return plate ?? fallback;
}

function findPlateObject(root: THREE.Object3D, plate: string): THREE.Object3D | null {
  let fallback: THREE.Object3D | null = null;
  let found: THREE.Object3D | null = null;
  root.traverse((obj) => {
    if (found) return;
    const name = obj.name.toLowerCase();
    if (name.includes(plate.toLowerCase())) {
      found = obj;
      return;
    }
    if (!fallback && (name.includes("plate") || name.includes("license"))) {
      fallback = obj;
    }
  });
  return found ?? fallback;
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
    capturePlate: null as THREE.Camera | null,
  };

  const capturePlateGLTF = await loadGLB("/models/capture_plate_camera.glb");
  const capturePlateRoot = capturePlateGLTF.scene;
  capturePlateRoot.name = "capture_plate_camera";
  debugNames(capturePlateRoot, "capture_plate_camera.glb");
  capturePlateRoot.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  const capturePlateCams = capturePlateGLTF.cameras;
  cameras.capturePlate =
    pickCamera(
      capturePlateCams,
      "capture_plate_camera",
      "capture_plate",
      "plate_camera",
      "camera",
    ) ?? capturePlateCams[0] ?? null;

  console.log("[SceneLoader] Resolved cameras:", {
    main:  cameras.main?.name  ?? "❌ MISSING",
    main2: cameras.main2?.name ?? "❌ MISSING (optional)",
    main3: cameras.main3?.name ?? "❌ MISSING (optional)",
    main4: cameras.main4?.name ?? "❌ MISSING (optional)",
    main5: cameras.main5?.name ?? "❌ MISSING (optional)",
    capturePlate: cameras.capturePlate?.name ?? "❌ MISSING",
  });

  (["main", "capturePlate"] as const).forEach((key) => {
    if (!cameras[key]) {
      console.warn(
        `[SceneLoader] Camera "${key}" is MISSING. Available: ${[
          ...gltfCams,
          ...capturePlateCams,
        ].map((c) => c.name).join(", ")}`,
      );
    }
  });

  camRoot.updateWorldMatrix(true, true);
  capturePlateRoot.updateWorldMatrix(true, true);
  environment.add(capturePlateRoot);
  if (cameras.capturePlate) {
    cameras.capturePlate.updateMatrixWorld(true);
    if ((cameras.capturePlate as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const pcam = cameras.capturePlate as THREE.PerspectiveCamera;
      pcam.zoom = CAPTURE_PLATE_CAMERA_ZOOM;
      pcam.updateProjectionMatrix();
    }
  }

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

  // ── Barrier ───────────────────────────────────────────────────────────────
  report("Loading barrier…", 24);
  let barrier: BarrierAsset | null = null;
  try {
    const barrierGLTF = await loadGLB("/models/barrier.glb");
    const barrierRoot = barrierGLTF.scene;
    barrierRoot.name = "barrier";
    debugNames(barrierRoot, "barrier.glb");
    const barrierPivot = pickBarrierPivot(barrierRoot);
    barrierRoot.visible = false;
    barrierRoot.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    console.log(
      `[SceneLoader] Barrier pivot: ${barrierPivot.type} "${barrierPivot.name || "(unnamed)"}"`,
    );
    environment.add(barrierRoot);
    barrier = { root: barrierRoot, pivot: barrierPivot };
  } catch (err) {
    console.warn(
      "[SceneLoader] barrier.glb failed to load — barrier feature disabled.",
      err,
    );
  }

  // ── Cars ──────────────────────────────────────────────────────────────────
  const cars: THREE.Group[] = [];
  const carMixers: THREE.AnimationMixer[] = [];
  const carClips: THREE.AnimationClip[][] = [];
  const carPlates: string[] = [];
  const carPlateMeshes: Array<THREE.Object3D | null> = [];

  for (let i = 1; i <= CAR_COUNT; i++) {
    report(`Loading car ${i} of ${CAR_COUNT}…`, 25 + (i / CAR_COUNT) * 68);
    const gltf = await loadGLB(`/models/car_${i}.glb`);
    const group = gltf.scene;
    group.name = `car_${i}`;
    const plate = readPlateFromModel(group, `RAB${String(i).padStart(3, "0")}`);
    const plateMesh = findPlateObject(group, plate);
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
    console.log(`[SceneLoader] car_${i}.glb — plate: ${plate}`);
    console.log(
      `[SceneLoader] car_${i}.glb — plate mesh: ${plateMesh?.name ?? "not found"}`,
    );
    const mixer = new THREE.AnimationMixer(group);
    cars.push(group);
    carMixers.push(mixer);
    carClips.push(gltf.animations);
    carPlates.push(plate);
    carPlateMeshes.push(plateMesh);
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
    barrier,
    carPlates,
    carPlateMeshes,
  };
}

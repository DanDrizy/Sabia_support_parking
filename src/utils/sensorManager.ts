import * as THREE from "three";
import { SensorMeshData, PlacedSensor, SensorOccupancy } from "../types";

export const RAY_LENGTH = 2.0; // increased range

const COLOR_EMPTY = new THREE.Color(0x00d4ff);
const COLOR_OCCUPIED = new THREE.Color(0xff2244);
const COLOR_INACTIVE = new THREE.Color(0x1a2332);

// Proximity sphere radius — if a car's bounding sphere centre is within this
// distance of the sensor, it counts as occupied regardless of raycasting.
// This is the fallback when ray misses due to mesh complexity.
const PROXIMITY_RADIUS = 3.0;

export class SensorManager {
  private sensors: SensorMeshData[];
  private placedIndices: Set<number> = new Set();
  private nextToPlace = 1;
  private raycaster = new THREE.Raycaster();
  private debugFrameCount = 0;

  constructor(sensors: SensorMeshData[]) {
    this.sensors = sensors;
    sensors.forEach((s) => {
      s.mesh.visible = false;
      this.applyColor(s, COLOR_INACTIVE);
    });
  }

  get totalSensors() {
    return this.sensors.length;
  }
  get nextSensorIndex() {
    return this.nextToPlace;
  }
  get allPlaced() {
    return this.nextToPlace > this.sensors.length;
  }

  placeNext(): PlacedSensor | null {
    if (this.allPlaced) return null;
    const idx = this.nextToPlace;
    const data = this.sensors.find((s) => s.index === idx);
    if (!data) {
      console.warn(`[SensorManager] sensor_${idx} not found`);
      this.nextToPlace++;
      return null;
    }

    data.mesh.visible = true;
    this.applyColor(data, COLOR_EMPTY);
    this.placedIndices.add(idx);
    this.nextToPlace++;

    // Capture live world position now that mesh is in the scene
    data.mesh.updateWorldMatrix(true, false);
    const livePos = new THREE.Vector3();
    data.mesh.getWorldPosition(livePos);
    data.worldPosition.copy(livePos);

    console.log(
      `[SensorManager] Placed sensor_${idx} at`,
      livePos.toArray().map((v) => v.toFixed(3)),
    );
    return { index: idx, label: `SENSOR ${idx}` };
  }

  remove(index: number) {
    const data = this.sensors.find((s) => s.index === index);
    if (!data) return;
    data.mesh.visible = false;
    this.applyColor(data, COLOR_INACTIVE);
    this.placedIndices.delete(index);
    if (index === this.nextToPlace - 1) this.nextToPlace = index;
  }

  removeAll() {
    this.sensors.forEach((s) => {
      s.mesh.visible = false;
      this.applyColor(s, COLOR_INACTIVE);
    });
    this.placedIndices.clear();
    this.nextToPlace = 1;
  }

  getPlacedIndices(): number[] {
    return Array.from(this.placedIndices).sort((a, b) => a - b);
  }

  tick(cars: THREE.Group[]): SensorOccupancy[] {
    const results: SensorOccupancy[] = [];
    if (this.placedIndices.size === 0) return results;

    this.debugFrameCount++;
    const shouldLog = this.debugFrameCount % 180 === 1; // log every ~3s at 60fps

    // ── Step 1: force-update all car world matrices ──────────────────────────
    cars.forEach((car) => car.updateWorldMatrix(true, true));

    // ── Step 2: collect ALL car meshes with their car index ──────────────────
    const carMeshEntries: { mesh: THREE.Mesh; carIndex: number }[] = [];
    cars.forEach((car, i) => {
      car.traverse((obj) => {
        if (!(obj as THREE.Mesh).isMesh) return;
        const mesh = obj as THREE.Mesh;
        if (!mesh.geometry) return;
        // Ensure bounding volumes are up to date
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        if (!mesh.geometry.boundingSphere)
          mesh.geometry.computeBoundingSphere();
        carMeshEntries.push({ mesh, carIndex: i + 1 });
      });
    });

    // ── Step 3: compute car bounding sphere centres in world space ────────────
    // Used for proximity fallback
    const carBounds: {
      centre: THREE.Vector3;
      radius: number;
      carIndex: number;
    }[] = [];
    cars.forEach((car, i) => {
      const box = new THREE.Box3().setFromObject(car);
      const centre = new THREE.Vector3();
      box.getCenter(centre);
      const size = new THREE.Vector3();
      box.getSize(size);
      const radius = size.length() * 0.5;
      carBounds.push({ centre, radius, carIndex: i + 1 });
    });

    const allCarMeshes = carMeshEntries.map((e) => e.mesh);
    const worldQuat = new THREE.Quaternion();

    // ── Step 4: fire rays in MULTIPLE directions from each sensor ────────────
    // We cast down (-Y), forward (-Z), and all four diagonals to maximise
    // chance of hitting a car regardless of sensor orientation in Blender.
    const rayDirections = [
      new THREE.Vector3(0, 0, -1), // imbere straight
      new THREE.Vector3(0.2, 0, -1).normalize(), // right small angle
      new THREE.Vector3(-0.2, 0, -1).normalize(), // left small angle
      new THREE.Vector3(0, -0.2, -1).normalize(), // down small
      new THREE.Vector3(0, 0.2, -1).normalize(), // up small
    ];

    for (const idx of this.placedIndices) {
      const data = this.sensors.find((s) => s.index === idx);
      if (!data) continue;

      // Refresh world position every frame
      data.mesh.updateWorldMatrix(true, false);
      data.mesh.getWorldPosition(data.worldPosition);
      data.mesh.getWorldQuaternion(worldQuat);

      let occupied = false;
      let hitCarIdx: number | null = null;
      let hitDist = -1;

      // ── Raycast: sensor-local -Y direction (primary) ──────────────────────
      const localDown = new THREE.Vector3(0, -1, 0)
        .applyQuaternion(worldQuat)
        .normalize();

      this.raycaster.set(data.worldPosition, localDown);
      this.raycaster.near = 0;
      this.raycaster.far = RAY_LENGTH;

      let hits = this.raycaster.intersectObjects(allCarMeshes, false);

      // ── Raycast: try all fallback directions if primary misses ────────────
      if (hits.length === 0) {
        for (const dir of rayDirections) {
          const worldDir = dir.clone().applyQuaternion(worldQuat).normalize();
          this.raycaster.set(data.worldPosition, worldDir);
          hits = this.raycaster.intersectObjects(allCarMeshes, false);
          if (hits.length > 0) break;
        }
      }

      // ── Proximity fallback: bounding-box centre distance ──────────────────
      if (hits.length === 0) {
        let closestDist = Infinity;
        let closestIdx: number | null = null;
        for (const cb of carBounds) {
          const d = data.worldPosition.distanceTo(cb.centre);
          if (d < PROXIMITY_RADIUS && d < closestDist) {
            closestDist = d;
            closestIdx = cb.carIndex;
          }
        }
        if (closestIdx !== null) {
          occupied = true;
          hitCarIdx = closestIdx;
          hitDist = closestDist;
          if (shouldLog) {
            console.log(
              `[SensorManager] sensor_${idx} — proximity hit car_${closestIdx} dist=${closestDist.toFixed(3)}`,
            );
          }
        }
      } else {
        const closest = hits[0];
        hitDist = closest.distance;
        const entry = carMeshEntries.find((e) => e.mesh === closest.object);
        if (entry) {
          occupied = true;
          hitCarIdx = entry.carIndex;
        }
      }

      if (shouldLog) {
        console.log(
          `[SensorManager] sensor_${idx}`,
          `pos=[${data.worldPosition
            .toArray()
            .map((v) => v.toFixed(2))
            .join(",")}]`,
          occupied
            ? `✅ occupied by car_${hitCarIdx} dist=${hitDist.toFixed(2)}`
            : `⬜ empty`,
        );
      }

      this.applyColor(data, occupied ? COLOR_OCCUPIED : COLOR_EMPTY);
      results.push({
        sensorIndex: idx,
        occupied,
        carIndex: hitCarIdx,
        distance: hitDist,
      });
    }

    return results;
  }

  private applyColor(data: SensorMeshData, color: THREE.Color) {
    const setOnMat = (mat: THREE.Material) => {
      if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
        const m = mat as THREE.MeshStandardMaterial;
        m.color = color.clone();
        m.emissive = color.clone().multiplyScalar(0.5);
        m.emissiveIntensity = color === COLOR_INACTIVE ? 0.1 : 0.9;
        m.needsUpdate = true;
      } else if ((mat as THREE.MeshPhongMaterial).isMeshPhongMaterial) {
        const m = mat as THREE.MeshPhongMaterial;
        m.color = color.clone();
        m.emissive = color.clone().multiplyScalar(0.4);
        m.needsUpdate = true;
      }
    };
    const mat = data.mesh.material;
    if (Array.isArray(mat)) mat.forEach(setOnMat);
    else setOnMat(mat);
  }
}

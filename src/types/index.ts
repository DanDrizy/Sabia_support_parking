import * as THREE from "three";

export interface SceneAssets {
  environment: THREE.Group;
  cars: THREE.Group[];
  carMixers: THREE.AnimationMixer[];
  carClips: THREE.AnimationClip[][];
  cameras: {
    main: THREE.Camera | null;
    in1: THREE.Camera | null;
    in2: THREE.Camera | null;
    out1: THREE.Camera | null;
    out2: THREE.Camera | null;
  };
  collisionMeshes: THREE.Mesh[];
  hdriTexture: THREE.DataTexture | null;
  sensorMeshes: SensorMeshData[];
  
}

export interface SensorMeshData {
  index: number; // 1-based (sensor_1 … sensor_7)
  mesh: THREE.Mesh;
  worldPosition: THREE.Vector3; // exported position — never changes
}

export interface PlacedSensor {
  index: number; // 1-based
  label: string; // "SENSOR 1"
}

/** Live occupancy state for one sensor — updated every frame from the render loop */
export interface SensorOccupancy {
  sensorIndex: number;
  occupied: boolean;
  carIndex: number | null; // 1-based car index if occupied, else null
  distance: number; // closest car distance in metres
}

export interface PlayerState {
  position: THREE.Vector3;
  yaw: number;
  pitch: number;
}

export interface CameraView {
  id: string;
  label: string;
  camera: THREE.Camera | null;
  isMain: boolean;
}

export type CarAnimState = {
  currentCar: number;
  isPlaying: boolean;
  finished: boolean[];
};

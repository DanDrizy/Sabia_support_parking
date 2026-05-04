import * as THREE from "three";

export interface SceneAssets {
  environment: THREE.Group;
  cars: THREE.Group[];
  carMixers: THREE.AnimationMixer[];
  carClips: THREE.AnimationClip[][];
  cameras: {
    main: THREE.Camera | null;
    main2: THREE.Camera | null;
    main3: THREE.Camera | null;
    main4: THREE.Camera | null;
    main5: THREE.Camera | null;
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
  index: number;
  mesh: THREE.Mesh;
  worldPosition: THREE.Vector3;
}

export interface PlacedSensor {
  index: number;
  label: string;
}

export interface SensorOccupancy {
  sensorIndex: number;
  occupied: boolean;
  carIndex: number | null;
  distance: number;
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

export type MainCamKey = "main" | "main2" | "main3" | "main4" | "main5";

export type CarAnimState = {
  currentCar: number;
  isPlaying: boolean;
  finished: boolean[];
};
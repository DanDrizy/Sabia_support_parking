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
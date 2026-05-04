import { useEffect, useRef } from "react";
import * as THREE from "three";

const LOOK_SENSITIVITY = 0.004;
const ZOOM_SENSITIVITY = 0.05;
const MAX_PITCH = Math.PI / 2 - 0.05;
const MAX_YAW_OFFSET = Math.PI / 2;
const MOVE_SPEED = 8;

interface UsePlayerControllerOptions {
  camera: THREE.Camera | null;
  collisionMeshes: THREE.Mesh[];
  enabled: boolean;
  canvasEl: HTMLCanvasElement | null;
}

export function usePlayerController({
  camera,
  enabled,
  canvasEl,
}: UsePlayerControllerOptions) {
  const pitchRef = useRef(0);
  const yawRef = useRef(0);
  const baseYawRef = useRef(0);
  const basePitchRef = useRef(0);
  const isDraggingRef = useRef(false);
  const baseFovRef = useRef(60);
  const keysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!camera) return;
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    baseYawRef.current = euler.y;
    basePitchRef.current = euler.x;
    yawRef.current = 0;
    pitchRef.current = 0;
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      baseFovRef.current = (camera as THREE.PerspectiveCamera).fov;
    }
  }, [camera]);

  useEffect(() => {
    if (!enabled || !canvasEl) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDraggingRef.current = true;
        canvasEl.style.cursor = "grabbing";
      }
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
      canvasEl.style.cursor = "grab";
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      yawRef.current = Math.max(
        -MAX_YAW_OFFSET,
        Math.min(
          MAX_YAW_OFFSET,
          yawRef.current - e.movementX * LOOK_SENSITIVITY,
        ),
      );
      pitchRef.current = Math.max(
        -MAX_PITCH - basePitchRef.current,
        Math.min(
          MAX_PITCH - basePitchRef.current,
          pitchRef.current - e.movementY * LOOK_SENSITIVITY,
        ),
      );
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!(camera as THREE.PerspectiveCamera).isPerspectiveCamera) return;
      const pcam = camera as THREE.PerspectiveCamera;
      pcam.fov = Math.max(
        10,
        Math.min(120, pcam.fov + e.deltaY * ZOOM_SENSITIVITY),
      );
      pcam.updateProjectionMatrix();
    };
    const onKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.code);
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    const onContextMenu = (e: Event) => e.preventDefault();

    canvasEl.style.cursor = "grab";
    canvasEl.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    canvasEl.addEventListener("wheel", onWheel, { passive: false });
    canvasEl.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      canvasEl.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      canvasEl.removeEventListener("wheel", onWheel);
      canvasEl.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvasEl.style.cursor = "";
    };
  }, [enabled, canvasEl, camera]);

  function update(dt: number) {
    if (!enabled || !camera) return;

    const yawQ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      baseYawRef.current + yawRef.current,
    );
    const pitchQ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      basePitchRef.current + pitchRef.current,
    );
    camera.quaternion.copy(yawQ).multiply(pitchQ);

    const keys = keysRef.current;
    const forward = keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0;
    const backward = keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0;
    const left = keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0;
    const right = keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0;
    const up = keys.has("Space") ? 1 : 0;
    const down = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 1 : 0;

    if (forward || backward || left || right || up || down) {
      const moveDir = new THREE.Vector3(
        right - left,
        up - down,
        backward - forward,
      ).normalize();
      const yawOnly = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        baseYawRef.current + yawRef.current,
      );
      moveDir.applyQuaternion(yawOnly);
      moveDir.multiplyScalar(MOVE_SPEED * dt);
      camera.position.add(moveDir);
    }
  }

  return { update };
}

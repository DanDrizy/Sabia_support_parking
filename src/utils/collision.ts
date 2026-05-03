import * as THREE from "three";

const PLAYER_HEIGHT = 1.75; // eye level above ground
const PLAYER_RADIUS = 0.4; // capsule radius for wall sliding
const GRAVITY = -9.8;
const STEP_HEIGHT = 0.35; // max step the player can walk up

// Directions for wall-probe raycasts (8 horizontal directions)
const PROBE_DIRS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2;
  return new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
});

export class PlayerCollision {
  private raycaster = new THREE.Raycaster();
  private meshes: THREE.Mesh[] = [];
  private verticalVelocity = 0;
  private onGround = false;

  constructor(meshes: THREE.Mesh[]) {
    this.meshes = meshes;
  }

  updateMeshes(meshes: THREE.Mesh[]) {
    this.meshes = meshes;
  }

  /**
   * Move the player position by `delta`, resolving collisions.
   * Returns the corrected new position.
   */
  move(
    currentPos: THREE.Vector3,
    desiredDelta: THREE.Vector3,
    dt: number,
  ): THREE.Vector3 {
    const pos = currentPos.clone();

    // ── Gravity ──────────────────────────────────────────────────────────────
    this.verticalVelocity += GRAVITY * dt;
    pos.y += this.verticalVelocity * dt;

    // ── Ground check ─────────────────────────────────────────────────────────
    const groundOrigin = pos.clone();
    groundOrigin.y += PLAYER_HEIGHT; // cast from head downward
    this.raycaster.set(groundOrigin, new THREE.Vector3(0, -1, 0));
    this.raycaster.far = PLAYER_HEIGHT + STEP_HEIGHT + 0.1;

    const groundHits = this.raycaster.intersectObjects(this.meshes, false);
    if (groundHits.length > 0) {
      const hit = groundHits[0];
      const groundY = hit.point.y;
      if (pos.y <= groundY) {
        pos.y = groundY;
        this.verticalVelocity = 0;
        this.onGround = true;
      }
    } else {
      this.onGround = false;
    }

    // ── Horizontal movement with wall sliding ─────────────────────────────────
    const move = new THREE.Vector3(desiredDelta.x, 0, desiredDelta.z);
    if (move.lengthSq() > 0) {
      const moveOrigin = pos.clone();
      moveOrigin.y += PLAYER_HEIGHT * 0.5; // mid-body level

      // Try to move along each probe direction and push back on collision
      for (const dir of PROBE_DIRS) {
        this.raycaster.set(moveOrigin, dir);
        this.raycaster.far = PLAYER_RADIUS;

        const hits = this.raycaster.intersectObjects(this.meshes, false);
        if (hits.length > 0) {
          const hit = hits[0];
          const pushBack = dir
            .clone()
            .multiplyScalar(PLAYER_RADIUS - hit.distance);
          move.sub(pushBack);
        }
      }

      pos.add(move);
    }

    return pos;
  }

  isOnGround(): boolean {
    return this.onGround;
  }

  resetVertical() {
    this.verticalVelocity = 0;
  }
}

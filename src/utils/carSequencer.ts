import * as THREE from "three";

export class CarAnimationSequencer {
  private mixers: THREE.AnimationMixer[];
  private clips: THREE.AnimationClip[][];
  private currentIndex = 0;
  private started = false;
  private paused = false;
  private onAllFinished?: () => void;
  private onCarChange?: (index: number) => void;
  private onCurrentCarFinished?: () => void;
  private onProgressUpdate?: (progress: number, duration: number) => void;
  private finishedSet = new Set<number>();
  private carSpeedBoost = 1.0;

  constructor(
    mixers: THREE.AnimationMixer[],
    clips: THREE.AnimationClip[][],
    onAllFinished?: () => void,
    onCarChange?: (index: number) => void,
    onCurrentCarFinished?: () => void,
    onProgressUpdate?: (progress: number, duration: number) => void,
  ) {
    this.mixers = mixers;
    this.clips = clips;
    this.onAllFinished = onAllFinished;
    this.onCarChange = onCarChange;
    this.onCurrentCarFinished = onCurrentCarFinished;
    this.onProgressUpdate = onProgressUpdate;
  }

  start() {
    this.currentIndex = 0;
    this.started = true;
    this.paused = false;
    this.carSpeedBoost = 1.0;
    this.finishedSet.clear();
    this.playCurrentCar();
  }

  private playCurrentCar() {
    const i = this.currentIndex;
    if (i >= this.mixers.length) {
      this.onAllFinished?.();
      return;
    }

    this.onCarChange?.(i);
    this.carSpeedBoost = 1.0;

    const mixer = this.mixers[i];
    const clips = this.clips[i];

    if (!clips || clips.length === 0) {
      this.finishedSet.add(i);
      this.currentIndex++;
      this.playCurrentCar();
      return;
    }

    mixer.stopAllAction();

    clips.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.reset().play();
    });

    const onFinished = () => {
      if (this.finishedSet.has(i)) return;
      this.finishedSet.add(i);
      mixer.removeEventListener("finished", onFinished as never);
      this.onCurrentCarFinished?.();
      this.currentIndex++;
      this.playCurrentCar();
    };

    mixer.addEventListener("finished", onFinished as never);
  }

  togglePause() {
    this.paused = !this.paused;
    const mixer = this.mixers[this.currentIndex];
    if (!mixer) return;
    const clips = this.clips[this.currentIndex] ?? [];
    clips.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.paused = this.paused;
    });
  }

  isPaused(): boolean {
    return this.paused;
  }

  fasterCurrent() {
    this.carSpeedBoost = Math.min(this.carSpeedBoost + 1, 5);
  }

  getCarSpeedBoost(): number {
    return this.carSpeedBoost;
  }

  repeatCurrent() {
    const i = this.currentIndex;
    if (i >= this.mixers.length) return;
    this.finishedSet.delete(i);
    this.paused = false;
    this.carSpeedBoost = 1.0;
    this.playCurrentCar();
  }

  isCurrentFinished(): boolean {
    return this.finishedSet.has(this.currentIndex);
  }

  goToCar(index: number) {
    if (index < 0 || index >= this.mixers.length) return;
    this.mixers[this.currentIndex]?.stopAllAction();
    this.currentIndex = index;
    this.finishedSet.delete(index);
    this.paused = false;
    this.carSpeedBoost = 1.0;
    this.playCurrentCar();
  }

  previousCar() {
    this.goToCar(this.currentIndex - 1);
  }
  nextCar() {
    this.goToCar(this.currentIndex + 1);
  }

  seekTo(time: number) {
    const i = this.currentIndex;
    const mixer = this.mixers[i];
    const clips = this.clips[i];
    if (!mixer || !clips || clips.length === 0) return;

    if (this.finishedSet.has(i)) {
      this.finishedSet.delete(i);
      mixer.stopAllAction();
      clips.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.reset().play();
        action.paused = true;
      });
    }

    clips.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.time = Math.max(0, Math.min(time, clip.duration));
      mixer.update(0);
      action.paused = this.paused;
    });
  }

  getProgress(): [number, number] {
    const i = this.currentIndex;
    const clips = this.clips[i];
    const mixer = this.mixers[i];
    if (!clips || clips.length === 0 || !mixer) return [0, 0];
    const clip = clips[0];
    const action = mixer.clipAction(clip);
    return [action.time, clip.duration];
  }

  skipCurrent() {
    const i = this.currentIndex;
    if (!this.started || i >= this.mixers.length) return;
    if (this.finishedSet.has(i)) return;

    const mixer = this.mixers[i];
    mixer.stopAllAction();
    this.clips[i]?.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.reset();
      action.time = clip.duration;
      action.play();
      action.paused = true;
    });

    this.finishedSet.add(i);
    mixer.removeEventListener("finished", () => {});
    this.currentIndex++;
    this.playCurrentCar();
  }

  update(dt: number) {
    if (!this.started || this.paused) return;
    const boostedDt = dt * this.carSpeedBoost;
    for (let i = 0; i <= this.currentIndex && i < this.mixers.length; i++) {
      this.mixers[i].update(boostedDt);
    }
    const [time, duration] = this.getProgress();
    this.onProgressUpdate?.(time, duration);
  }

  getCurrentCarIndex(): number {
    return this.currentIndex;
  }

  isFinished(): boolean {
    return this.started && this.currentIndex >= this.mixers.length;
  }

  restart() {
    this.mixers.forEach((m) => m.stopAllAction());
    this.currentIndex = 0;
    this.finishedSet.clear();
    this.start();
  }
}

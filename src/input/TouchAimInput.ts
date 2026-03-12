import type { CalibrationProfile } from '../types';
import { AimFilter } from './AimFilter';
import type { AimInputAdapter, AimSnapshot, RawAimSample } from './types';

const TOUCH_YAW_RANGE = 0.58;
const TOUCH_PITCH_RANGE = 0.44;

export class TouchAimInput implements AimInputAdapter {
  public readonly mode = 'touch' as const;
  private filter = new AimFilter();
  private surface: HTMLElement | null = null;
  private activePointerId: number | null = null;
  private dragOriginX = 0;
  private dragOriginY = 0;
  private dragBaseYaw = 0;
  private dragBasePitch = 0;
  private raw: RawAimSample = { yaw: 0, pitch: 0, timestamp: Date.now() };
  private previousRaw: RawAimSample = this.raw;

  private readonly onPointerDown = (event: PointerEvent) => {
    if (!this.surface || this.activePointerId !== null) {
      return;
    }

    this.activePointerId = event.pointerId;
    this.dragOriginX = event.clientX;
    this.dragOriginY = event.clientY;
    this.dragBaseYaw = this.raw.yaw;
    this.dragBasePitch = this.raw.pitch;
    safeSetPointerCapture(this.surface, event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    if (this.activePointerId !== event.pointerId) {
      return;
    }

    this.updateFromDrag(event);
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    if (this.activePointerId !== event.pointerId) {
      return;
    }

    this.updateFromDrag(event);
    if (this.surface) {
      safeReleasePointerCapture(this.surface, event.pointerId);
    }
    this.activePointerId = null;
    this.dragBaseYaw = this.raw.yaw;
    this.dragBasePitch = this.raw.pitch;
  };

  public isSupported(): boolean {
    return true;
  }

  public start(): void {}

  public stop(): void {
    this.detachSurface();
  }

  public attachSurface(surface: HTMLElement): void {
    this.detachSurface();
    this.surface = surface;
    this.surface.addEventListener('pointerdown', this.onPointerDown);
    this.surface.addEventListener('pointermove', this.onPointerMove);
    this.surface.addEventListener('pointerup', this.onPointerUp);
    this.surface.addEventListener('pointercancel', this.onPointerUp);
  }

  public detachSurface(): void {
    if (this.surface) {
      this.surface.removeEventListener('pointerdown', this.onPointerDown);
      this.surface.removeEventListener('pointermove', this.onPointerMove);
      this.surface.removeEventListener('pointerup', this.onPointerUp);
      this.surface.removeEventListener('pointercancel', this.onPointerUp);
      this.surface = null;
    }
    this.activePointerId = null;
  }

  public setCalibration(_profile: CalibrationProfile | null): void {
    this.filter.configure(0.16, 0.012);
    this.filter.reset();
  }

  public getSnapshot(): AimSnapshot {
    const filtered = this.filter.update(this.raw);
    const motion = Math.hypot(this.raw.yaw - this.previousRaw.yaw, this.raw.pitch - this.previousRaw.pitch);

    return {
      source: this.mode,
      rawYaw: this.raw.yaw,
      rawPitch: this.raw.pitch,
      yaw: filtered.yaw,
      pitch: filtered.pitch,
      smoothedYaw: filtered.smoothedYaw,
      smoothedPitch: filtered.smoothedPitch,
      stability: Math.max(0, 1 - motion * 0.72),
    };
  }

  public getRawSample(): RawAimSample {
    return this.raw;
  }

  public recenter(): void {
    this.previousRaw = this.raw;
    this.raw = { yaw: 0, pitch: 0, timestamp: Date.now() };
    this.dragBaseYaw = 0;
    this.dragBasePitch = 0;
    this.filter.reset();
  }

  private updateFromDrag(event: PointerEvent): void {
    if (!this.surface) {
      return;
    }

    const rect = this.surface.getBoundingClientRect();
    const yawScale = TOUCH_YAW_RANGE / Math.max(rect.width * 0.36, 120);
    const pitchScale = TOUCH_PITCH_RANGE / Math.max(rect.height * 0.36, 120);
    const deltaX = event.clientX - this.dragOriginX;
    const deltaY = event.clientY - this.dragOriginY;

    this.previousRaw = this.raw;
    this.raw = {
      yaw: clamp(this.dragBaseYaw + deltaX * yawScale, -TOUCH_YAW_RANGE, TOUCH_YAW_RANGE),
      pitch: clamp(this.dragBasePitch - deltaY * pitchScale, -TOUCH_PITCH_RANGE, TOUCH_PITCH_RANGE),
      timestamp: Date.now(),
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safeSetPointerCapture(node: HTMLElement, pointerId: number): void {
  try {
    node.setPointerCapture?.(pointerId);
  } catch {
    // Ignore capture failures on browsers that reject synthetic or delayed pointers.
  }
}

function safeReleasePointerCapture(node: HTMLElement, pointerId: number): void {
  try {
    if (!node.hasPointerCapture || node.hasPointerCapture(pointerId)) {
      node.releasePointerCapture?.(pointerId);
    }
  } catch {
    // A missing capture should not break touch aiming.
  }
}

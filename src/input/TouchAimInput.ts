import type { CalibrationProfile } from '../types';
import { AimFilter } from './AimFilter';
import type { AimInputAdapter, AimSnapshot, RawAimSample } from './types';

const TOUCH_YAW_RANGE = 1.22;
const TOUCH_PITCH_RANGE = 1.05;

export class TouchAimInput implements AimInputAdapter {
  public readonly mode = 'touch' as const;
  private filter = new AimFilter();
  private surface: HTMLElement | null = null;
  private activePointerId: number | null = null;
  private raw: RawAimSample = { yaw: 0, pitch: 0, timestamp: Date.now() };
  private previousRaw: RawAimSample = this.raw;

  private readonly onPointerDown = (event: PointerEvent) => {
    if (!this.surface) {
      return;
    }

    this.activePointerId = event.pointerId;
    this.surface.setPointerCapture?.(event.pointerId);
    this.updateFromEvent(event);
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    if (this.activePointerId !== event.pointerId) {
      return;
    }

    this.updateFromEvent(event);
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    if (this.activePointerId !== event.pointerId) {
      return;
    }

    this.activePointerId = null;
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
    this.surface.addEventListener('pointerleave', this.onPointerUp);
  }

  public detachSurface(): void {
    if (this.surface) {
      this.surface.removeEventListener('pointerdown', this.onPointerDown);
      this.surface.removeEventListener('pointermove', this.onPointerMove);
      this.surface.removeEventListener('pointerup', this.onPointerUp);
      this.surface.removeEventListener('pointercancel', this.onPointerUp);
      this.surface.removeEventListener('pointerleave', this.onPointerUp);
      this.surface = null;
    }
    this.activePointerId = null;
  }

  public setCalibration(_profile: CalibrationProfile | null): void {
    this.filter.configure(0.18, 0.015);
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
      stability: Math.max(0, 1 - motion * 0.85),
    };
  }

  public getRawSample(): RawAimSample {
    return this.raw;
  }

  public recenter(): void {
    this.previousRaw = this.raw;
    this.raw = { yaw: 0, pitch: 0, timestamp: Date.now() };
    this.filter.reset();
  }

  private updateFromEvent(event: PointerEvent): void {
    if (!this.surface) {
      return;
    }

    const rect = this.surface.getBoundingClientRect();
    const normalizedX = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
    const normalizedY = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;

    this.previousRaw = this.raw;
    this.raw = {
      yaw: clamp(normalizedX * TOUCH_YAW_RANGE, -TOUCH_YAW_RANGE, TOUCH_YAW_RANGE),
      pitch: clamp(normalizedY * -TOUCH_PITCH_RANGE, -TOUCH_PITCH_RANGE, TOUCH_PITCH_RANGE),
      timestamp: Date.now(),
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

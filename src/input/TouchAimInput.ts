import type { CalibrationProfile } from '../types';
import { AimFilter } from './AimFilter';
import { applyQuickSync, normalizeRawSample } from './CalibrationService';
import type { AimInputAdapter, AimSnapshot, RawAimSample } from './types';

export class TouchAimInput implements AimInputAdapter {
  public readonly mode = 'touch' as const;
  private calibration: CalibrationProfile | null = null;
  private filter = new AimFilter();
  private surface: HTMLElement | null = null;
  private dragStart: { x: number; y: number } | null = null;
  private raw: RawAimSample = { yaw: 0, pitch: 0, timestamp: Date.now() };
  private previousRaw: RawAimSample = this.raw;

  private readonly onPointerDown = (event: PointerEvent) => {
    this.dragStart = { x: event.clientX, y: event.clientY };
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.surface || !this.dragStart) {
      return;
    }

    const rect = this.surface.getBoundingClientRect();
    const deltaX = (event.clientX - this.dragStart.x) / Math.max(rect.width, 1);
    const deltaY = (event.clientY - this.dragStart.y) / Math.max(rect.height, 1);

    this.previousRaw = this.raw;
    this.raw = {
      yaw: this.raw.yaw + deltaX * 2.3,
      pitch: this.raw.pitch - deltaY * 2.0,
      timestamp: Date.now(),
    };

    this.dragStart = { x: event.clientX, y: event.clientY };
  };

  private readonly onPointerUp = () => {
    this.dragStart = null;
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
  }

  public setCalibration(profile: CalibrationProfile | null): void {
    this.calibration = profile;
    this.filter.configure(profile?.smoothingAlpha ?? 0.18, profile?.deadzone ?? 0.02);
    this.filter.reset();
  }

  public getSnapshot(): AimSnapshot {
    const normalized = normalizeRawSample(this.calibration, this.raw);
    const filtered = this.filter.update(normalized);
    const motion = Math.hypot(this.raw.yaw - this.previousRaw.yaw, this.raw.pitch - this.previousRaw.pitch);

    return {
      source: this.mode,
      rawYaw: this.raw.yaw,
      rawPitch: this.raw.pitch,
      yaw: filtered.yaw,
      pitch: filtered.pitch,
      smoothedYaw: filtered.smoothedYaw,
      smoothedPitch: filtered.smoothedPitch,
      stability: Math.max(0, 1 - motion * 0.75),
    };
  }

  public getRawSample(): RawAimSample {
    return this.raw;
  }

  public recenter(sample = this.raw): void {
    if (this.calibration) {
      this.calibration = applyQuickSync(this.calibration, sample);
      this.setCalibration(this.calibration);
    } else {
      this.previousRaw = this.raw;
      this.raw = { yaw: 0, pitch: 0, timestamp: sample.timestamp };
    }
  }
}

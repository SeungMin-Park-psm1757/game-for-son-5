import type { CalibrationProfile } from '../types';
import { AimFilter } from './AimFilter';
import { applyQuickSync, normalizeRawSample } from './CalibrationService';
import type { AimInputAdapter, AimSnapshot, RawAimSample } from './types';

export class DesktopAimInput implements AimInputAdapter {
  public readonly mode = 'desktop' as const;
  private calibration: CalibrationProfile | null = null;
  private filter = new AimFilter();
  private surface: HTMLElement | null = null;
  private raw: RawAimSample = { yaw: 0, pitch: 0, timestamp: Date.now() };
  private previousRaw: RawAimSample = this.raw;

  private readonly onMouseMove = (event: MouseEvent) => {
    if (!this.surface) {
      return;
    }

    const rect = this.surface.getBoundingClientRect();
    const normalizedX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const normalizedY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    this.previousRaw = this.raw;
    this.raw = {
      yaw: normalizedX * 1.3,
      pitch: normalizedY * -1.1,
      timestamp: Date.now(),
    };
  };

  private readonly onKeyDown = (event: KeyboardEvent) => {
    const step = 0.045;
    let nextYaw = this.raw.yaw;
    let nextPitch = this.raw.pitch;

    if (event.key === 'ArrowLeft') {
      nextYaw -= step;
    } else if (event.key === 'ArrowRight') {
      nextYaw += step;
    } else if (event.key === 'ArrowUp') {
      nextPitch += step;
    } else if (event.key === 'ArrowDown') {
      nextPitch -= step;
    }

    if (nextYaw !== this.raw.yaw || nextPitch !== this.raw.pitch) {
      this.previousRaw = this.raw;
      this.raw = { yaw: nextYaw, pitch: nextPitch, timestamp: Date.now() };
    }
  };

  public isSupported(): boolean {
    return true;
  }

  public start(): void {
    window.addEventListener('keydown', this.onKeyDown);
  }

  public stop(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.detachSurface();
  }

  public attachSurface(surface: HTMLElement): void {
    this.detachSurface();
    this.surface = surface;
    this.surface.addEventListener('mousemove', this.onMouseMove);
  }

  public detachSurface(): void {
    if (this.surface) {
      this.surface.removeEventListener('mousemove', this.onMouseMove);
      this.surface = null;
    }
  }

  public setCalibration(profile: CalibrationProfile | null): void {
    this.calibration = profile;
    this.filter.configure(profile?.smoothingAlpha ?? 0.2, profile?.deadzone ?? 0.02);
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
      stability: Math.max(0, 1 - motion * 0.9),
    };
  }

  public getRawSample(): RawAimSample {
    return this.raw;
  }

  public recenter(sample = this.raw): void {
    if (this.calibration) {
      this.calibration = applyQuickSync(this.calibration, sample);
      this.setCalibration(this.calibration);
    }
  }
}

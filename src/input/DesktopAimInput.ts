import type { CalibrationProfile } from '../types';
import { AimFilter } from './AimFilter';
import type { AimInputAdapter, AimSnapshot, RawAimSample } from './types';

export class DesktopAimInput implements AimInputAdapter {
  public readonly mode = 'desktop' as const;
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
      yaw: normalizedX * 0.68,
      pitch: normalizedY * -0.58,
      timestamp: Date.now(),
    };
  };

  private readonly onKeyDown = (event: KeyboardEvent) => {
    const step = 0.04;
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

  public setCalibration(_profile: CalibrationProfile | null): void {
    this.filter.configure(0.2, 0.015);
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
      stability: Math.max(0, 1 - motion * 0.92),
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
}

import type { CalibrationProfile } from '../types';
import { AimFilter } from './AimFilter';
import type { AimInputAdapter, AimSnapshot, RawAimSample } from './types';

const DESKTOP_YAW_RANGE = 0.58;
const DESKTOP_PITCH_RANGE = 0.46;

export class DesktopAimInput implements AimInputAdapter {
  public readonly mode = 'desktop' as const;
  private filter = new AimFilter();
  private surface: HTMLElement | null = null;
  private raw: RawAimSample = { yaw: 0, pitch: 0, timestamp: Date.now() };
  private previousRaw: RawAimSample = this.raw;

  private readonly onPointerMove = (event: PointerEvent) => {
    this.updateFromClientPosition(event.clientX, event.clientY);
  };

  private readonly onMouseMove = (event: MouseEvent) => {
    this.updateFromClientPosition(event.clientX, event.clientY);
  };

  private readonly onKeyDown = (event: KeyboardEvent) => {
    const step = 0.035;
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
      this.raw = {
        yaw: clamp(nextYaw, -DESKTOP_YAW_RANGE, DESKTOP_YAW_RANGE),
        pitch: clamp(nextPitch, -DESKTOP_PITCH_RANGE, DESKTOP_PITCH_RANGE),
        timestamp: Date.now(),
      };
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
    this.surface.addEventListener('pointermove', this.onPointerMove);
    this.surface.addEventListener('mousemove', this.onMouseMove);
  }

  public detachSurface(): void {
    if (this.surface) {
      this.surface.removeEventListener('pointermove', this.onPointerMove);
      this.surface.removeEventListener('mousemove', this.onMouseMove);
      this.surface = null;
    }
  }

  public setCalibration(_profile: CalibrationProfile | null): void {
    this.filter.configure(0.18, 0.012);
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
      stability: Math.max(0, 1 - motion * 0.86),
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

  private updateFromClientPosition(clientX: number, clientY: number): void {
    if (!this.surface) {
      return;
    }

    const rect = this.surface.getBoundingClientRect();
    const normalizedX = ((clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
    const normalizedY = ((clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;

    this.previousRaw = this.raw;
    this.raw = {
      yaw: clamp(normalizedX * DESKTOP_YAW_RANGE, -DESKTOP_YAW_RANGE, DESKTOP_YAW_RANGE),
      pitch: clamp(normalizedY * -DESKTOP_PITCH_RANGE, -DESKTOP_PITCH_RANGE, DESKTOP_PITCH_RANGE),
      timestamp: Date.now(),
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

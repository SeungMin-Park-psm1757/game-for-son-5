import type { CalibrationProfile } from '../types';
import { AimFilter } from './AimFilter';
import { applyQuickSync, normalizeRawSample } from './CalibrationService';
import type { AimInputAdapter, AimSnapshot, RawAimSample } from './types';

type DeviceOrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

export class SensorAimInput implements AimInputAdapter {
  public readonly mode = 'sensor' as const;
  private calibration: CalibrationProfile | null = null;
  private filter = new AimFilter();
  private raw: RawAimSample = { yaw: 0, pitch: 0, timestamp: Date.now() };
  private previousRaw: RawAimSample = this.raw;
  private readonly onOrientation = (event: DeviceOrientationEvent) => {
    this.previousRaw = this.raw;
    this.raw = {
      yaw: (event.gamma ?? 0) / 45,
      pitch: (event.beta ?? 0) / 55,
      timestamp: Date.now(),
    };
  };

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  }

  public async requestPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
    if (!this.isSupported()) {
      return 'unsupported';
    }

    const permissionApi = DeviceOrientationEvent as DeviceOrientationWithPermission;
    if (typeof permissionApi.requestPermission === 'function') {
      try {
        const result = await permissionApi.requestPermission();
        return result === 'granted' ? 'granted' : 'denied';
      } catch {
        return 'denied';
      }
    }

    return 'granted';
  }

  public start(): void {
    window.addEventListener('deviceorientation', this.onOrientation);
  }

  public stop(): void {
    window.removeEventListener('deviceorientation', this.onOrientation);
  }

  public attachSurface(_surface: HTMLElement): void {}

  public detachSurface(): void {}

  public setCalibration(profile: CalibrationProfile | null): void {
    this.calibration = profile;
    this.filter.configure(profile?.smoothingAlpha ?? 0.16, profile?.deadzone ?? 0.015);
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
      stability: Math.max(0, 1 - motion * 1.2),
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

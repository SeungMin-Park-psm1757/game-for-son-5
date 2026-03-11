import type { CalibrationProfile, InputMode } from '../types';

export interface RawAimSample {
  yaw: number;
  pitch: number;
  timestamp: number;
}

export interface AimSnapshot {
  source: InputMode;
  rawYaw: number;
  rawPitch: number;
  yaw: number;
  pitch: number;
  smoothedYaw: number;
  smoothedPitch: number;
  stability: number;
}

export interface AimInputAdapter {
  readonly mode: InputMode;
  start(): Promise<void> | void;
  stop(): void;
  attachSurface(surface: HTMLElement): void;
  detachSurface(): void;
  setCalibration(profile: CalibrationProfile | null): void;
  getSnapshot(): AimSnapshot;
  getRawSample(): RawAimSample;
  recenter(sample?: RawAimSample): void;
  isSupported(): boolean;
  requestPermission?(): Promise<'granted' | 'denied' | 'unsupported'>;
}

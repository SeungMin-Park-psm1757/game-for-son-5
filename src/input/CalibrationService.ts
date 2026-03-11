import type { CalibrationProfile, DominantHand, InputMode } from '../types';
import type { AimInputAdapter, RawAimSample } from './types';

export interface RangeMeasurement {
  yawRange: number;
  pitchRange: number;
}

export interface FilterRecommendation {
  deadzone: number;
  smoothingAlpha: number;
  jitter: number;
}

export async function captureSamples(
  adapter: AimInputAdapter,
  durationMs: number,
  onProgress?: (progress: number) => void,
): Promise<RawAimSample[]> {
  const startedAt = performance.now();
  const samples: RawAimSample[] = [];

  return new Promise((resolve) => {
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      samples.push(adapter.getRawSample());
      onProgress?.(Math.min(elapsed / durationMs, 1));

      if (elapsed >= durationMs) {
        resolve(samples);
        return;
      }

      window.requestAnimationFrame(tick);
    };

    tick();
  });
}

export function averageSamples(samples: RawAimSample[]): RawAimSample {
  if (samples.length === 0) {
    return { yaw: 0, pitch: 0, timestamp: Date.now() };
  }

  const total = samples.reduce(
    (carry, sample) => {
      carry.yaw += sample.yaw;
      carry.pitch += sample.pitch;
      return carry;
    },
    { yaw: 0, pitch: 0 },
  );

  return {
    yaw: total.yaw / samples.length,
    pitch: total.pitch / samples.length,
    timestamp: samples.length > 0 ? samples[samples.length - 1].timestamp : Date.now(),
  };
}

export function measureRange(samples: RawAimSample[], neutral: RawAimSample): RangeMeasurement {
  return {
    yawRange: Math.max(samples.reduce((max, sample) => Math.max(max, Math.abs(sample.yaw - neutral.yaw)), 0), 1),
    pitchRange: Math.max(samples.reduce((max, sample) => Math.max(max, Math.abs(sample.pitch - neutral.pitch)), 0), 1),
  };
}

export function recommendSensitivity(range: RangeMeasurement): { yaw: number; pitch: number } {
  return {
    yaw: Math.min(2.2, Math.max(0.55, 1.1 / range.yawRange)),
    pitch: Math.min(2.2, Math.max(0.55, 1.0 / range.pitchRange)),
  };
}

export function recommendFilterSettings(samples: RawAimSample[]): FilterRecommendation {
  if (samples.length < 2) {
    return {
      deadzone: 0.02,
      smoothingAlpha: 0.22,
      jitter: 0,
    };
  }

  const avg = averageSamples(samples);
  const jitter =
    samples.reduce((sum, sample) => sum + Math.hypot(sample.yaw - avg.yaw, sample.pitch - avg.pitch), 0) / samples.length;

  return {
    deadzone: Math.min(0.12, Math.max(0.015, jitter * 1.4)),
    smoothingAlpha: Math.min(0.32, Math.max(0.12, 0.32 - jitter * 0.8)),
    jitter,
  };
}

export function buildCalibrationProfile(
  inputMode: InputMode,
  dominantHand: DominantHand,
  neutral: RawAimSample,
  rangeSamples: RawAimSample[],
  jitterSamples: RawAimSample[],
): CalibrationProfile {
  const range = measureRange(rangeSamples, neutral);
  const sensitivity = recommendSensitivity(range);
  const filter = recommendFilterSettings(jitterSamples);

  return {
    version: Date.now(),
    inputMode,
    dominantHand,
    neutral: { yaw: neutral.yaw, pitch: neutral.pitch },
    zeroOffset: { yaw: 0, pitch: 0 },
    sensitivity,
    deadzone: filter.deadzone,
    smoothingAlpha: filter.smoothingAlpha,
    jitter: filter.jitter,
    hasCompletedFullCalibration: true,
    updatedAt: Date.now(),
  };
}

export function applyQuickSync(profile: CalibrationProfile, center: RawAimSample): CalibrationProfile {
  return {
    ...profile,
    zeroOffset: {
      yaw: center.yaw - profile.neutral.yaw,
      pitch: center.pitch - profile.neutral.pitch,
    },
    updatedAt: Date.now(),
  };
}

export function normalizeRawSample(profile: CalibrationProfile | null, raw: RawAimSample): RawAimSample {
  if (!profile) {
    return raw;
  }

  const handedness = profile.dominantHand === 'left' ? -1 : 1;
  return {
    yaw: (raw.yaw - profile.neutral.yaw - profile.zeroOffset.yaw) * profile.sensitivity.yaw * handedness,
    pitch: (raw.pitch - profile.neutral.pitch - profile.zeroOffset.pitch) * profile.sensitivity.pitch,
    timestamp: raw.timestamp,
  };
}

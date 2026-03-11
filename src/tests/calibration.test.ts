import { describe, expect, it } from 'vitest';
import {
  applyQuickSync,
  buildCalibrationProfile,
  normalizeRawSample,
  recommendFilterSettings,
} from '../input/CalibrationService';

describe('calibration math', () => {
  it('updates zero offset during quick sync', () => {
    const profile = buildCalibrationProfile(
      'sensor',
      'right',
      { yaw: 1, pitch: 2, timestamp: 0 },
      [
        { yaw: 1, pitch: 2, timestamp: 0 },
        { yaw: 2, pitch: 3, timestamp: 1 },
      ],
      [
        { yaw: 1, pitch: 2, timestamp: 0 },
        { yaw: 1.01, pitch: 2.01, timestamp: 1 },
      ],
    );

    const synced = applyQuickSync(profile, { yaw: 1.25, pitch: 2.5, timestamp: 2 });
    expect(synced.zeroOffset.yaw).toBeCloseTo(0.25);
    expect(synced.zeroOffset.pitch).toBeCloseTo(0.5);
  });

  it('recommends larger deadzone for noisier samples', () => {
    const calm = recommendFilterSettings([
      { yaw: 0, pitch: 0, timestamp: 0 },
      { yaw: 0.01, pitch: -0.01, timestamp: 1 },
      { yaw: -0.01, pitch: 0.01, timestamp: 2 },
    ]);
    const noisy = recommendFilterSettings([
      { yaw: 0, pitch: 0, timestamp: 0 },
      { yaw: 0.12, pitch: -0.08, timestamp: 1 },
      { yaw: -0.14, pitch: 0.09, timestamp: 2 },
    ]);

    expect(noisy.deadzone).toBeGreaterThan(calm.deadzone);
    expect(noisy.smoothingAlpha).toBeLessThanOrEqual(calm.smoothingAlpha);
  });

  it('normalizes raw samples around neutral and quick sync offsets', () => {
    const profile = buildCalibrationProfile(
      'sensor',
      'right',
      { yaw: 1, pitch: 1, timestamp: 0 },
      [
        { yaw: 0, pitch: 0, timestamp: 0 },
        { yaw: 2, pitch: 2, timestamp: 1 },
      ],
      [
        { yaw: 1, pitch: 1, timestamp: 0 },
        { yaw: 1.01, pitch: 1.02, timestamp: 1 },
      ],
    );
    const synced = applyQuickSync(profile, { yaw: 1.2, pitch: 1.1, timestamp: 2 });
    const normalized = normalizeRawSample(synced, { yaw: 1.2, pitch: 1.1, timestamp: 3 });

    expect(normalized.yaw).toBeCloseTo(0, 2);
    expect(normalized.pitch).toBeCloseTo(0, 2);
  });
});

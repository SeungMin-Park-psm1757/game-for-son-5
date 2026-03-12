import { describe, expect, it } from 'vitest';
import { simulateArrowFlight } from '../game/Ballistics';

describe('simulateArrowFlight', () => {
  it('keeps a centered shot close to the middle when wind is calm', () => {
    const result = simulateArrowFlight({
      aimYaw: 0,
      aimPitch: 0,
      drawDuration: 0.9,
      wind: 0,
      stability: 1,
      releaseQuality: 1,
    });

    expect(Math.abs(result.hitX)).toBeLessThan(0.15);
  });

  it('moves the impact right when yaw aim is positive', () => {
    const result = simulateArrowFlight({
      aimYaw: 0.4,
      aimPitch: 0,
      drawDuration: 0.9,
      wind: 0,
      stability: 1,
      releaseQuality: 1,
    });

    expect(result.hitX).toBeGreaterThan(0.25);
  });
});

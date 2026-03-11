import { describe, expect, it } from 'vitest';
import { scoreTarget, TARGET_RADIUS } from '../game/Scoring';

describe('scoreTarget', () => {
  it('returns X for a center hit', () => {
    const result = scoreTarget(0, 0);
    expect(result.score).toBe(10);
    expect(result.isBullseye).toBe(true);
    expect(result.isX).toBe(true);
  });

  it('returns lower score toward outer rings', () => {
    const result = scoreTarget(TARGET_RADIUS * 0.74, 0);
    expect(result.score).toBeLessThan(4);
    expect(result.score).toBeGreaterThan(0);
  });

  it('returns zero for a miss', () => {
    const result = scoreTarget(TARGET_RADIUS + 0.2, 0);
    expect(result.score).toBe(0);
    expect(result.isBullseye).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { scoreTarget, TARGET_RADIUS } from '../game/Scoring';
import { createRivalShot, getRivalProfile, pickRandomRival } from '../data/rival';

describe('rival data', () => {
  it('does not create a rival for practice mode', () => {
    expect(getRivalProfile('practice6')).toBeNull();
    expect(createRivalShot('practice6', 0)).toBeNull();
  });

  it('creates a rival for challenge modes', () => {
    const rival = getRivalProfile('chapterKorea9', 'siwoo');
    expect(rival?.name).toBe('시우');
  });

  it('can pick a random rival from the roster', () => {
    const rival = pickRandomRival('chapterKorea9', () => 0.9);
    expect(rival).not.toBeNull();
  });

  it('keeps rival shots within a plausible scoring area', () => {
    const shot = createRivalShot('chapterJapan9', 3, () => 0.42);
    expect(shot).not.toBeNull();
    expect(shot!.score).toBeGreaterThanOrEqual(0);
    expect(shot!.score).toBeLessThanOrEqual(10);
    expect(Math.hypot(shot!.hitX, shot!.hitY)).toBeLessThanOrEqual(TARGET_RADIUS + 0.12);

    const scored = scoreTarget(shot!.hitX, shot!.hitY);
    expect(scored.score).toBe(shot!.score);
    expect(scored.isX).toBe(shot!.isX);
  });
});

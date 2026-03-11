import { describe, expect, it } from 'vitest';
import { getTopScoreRecords, getTopXRecords, isPersonalBest } from '../data/records';
import type { MatchRecord } from '../types';

const baseRecord = (overrides: Partial<MatchRecord>): MatchRecord => ({
  id: crypto.randomUUID(),
  mode: 'trial12',
  totalScore: 90,
  arrowScores: [8, 8, 8],
  xCount: 1,
  averageStability: 0.7,
  averageReleaseQuality: 0.72,
  matchDurationMs: 30_000,
  windSummary: '고요',
  timestamp: 1,
  calibrationVersion: 1,
  resultBand: 'silver',
  ...overrides,
});

describe('record sorting', () => {
  it('sorts the score board by total, then X, then recency', () => {
    const records = [
      baseRecord({ id: 'a', totalScore: 100, xCount: 1, timestamp: 1 }),
      baseRecord({ id: 'b', totalScore: 100, xCount: 2, timestamp: 2 }),
      baseRecord({ id: 'c', totalScore: 98, xCount: 4, timestamp: 3 }),
    ];

    expect(getTopScoreRecords(records).map((record) => record.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts the X board by X, then total, then recency', () => {
    const records = [
      baseRecord({ id: 'a', totalScore: 102, xCount: 2, timestamp: 1 }),
      baseRecord({ id: 'b', totalScore: 99, xCount: 3, timestamp: 2 }),
      baseRecord({ id: 'c', totalScore: 105, xCount: 3, timestamp: 1 }),
    ];

    expect(getTopXRecords(records).map((record) => record.id)).toEqual(['c', 'b', 'a']);
  });

  it('detects a personal best across tie-breakers', () => {
    const existing = [baseRecord({ totalScore: 100, xCount: 2, timestamp: 10 })];
    expect(isPersonalBest(baseRecord({ totalScore: 100, xCount: 3, timestamp: 9 }), existing)).toBe(true);
    expect(isPersonalBest(baseRecord({ totalScore: 99, xCount: 5, timestamp: 99 }), existing)).toBe(false);
  });
});

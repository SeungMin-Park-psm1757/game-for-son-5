import { RING_WIDTH, TARGET_RADIUS, X_RING_RADIUS, scoreTarget } from '../game/Scoring';
import type { ModeId } from '../types';

export interface RivalProfile {
  id: string;
  name: string;
  title: string;
  accent: string;
  accentSoft: string;
}

export interface RivalShot {
  score: number;
  isX: boolean;
  hitX: number;
  hitY: number;
}

const RIVAL_PROFILE: RivalProfile = {
  id: 'rival-harin',
  name: '하린',
  title: '국제 주니어 라이벌',
  accent: '#7b3f97',
  accentSoft: 'rgba(123, 63, 151, 0.14)',
};

const RIVAL_SCORE_WEIGHTS: Record<Exclude<ModeId, 'practice6'>, Array<{ score: number; weight: number }>> = {
  chapterKorea9: [
    { score: 3, weight: 0.04 },
    { score: 4, weight: 0.08 },
    { score: 5, weight: 0.18 },
    { score: 6, weight: 0.24 },
    { score: 7, weight: 0.22 },
    { score: 8, weight: 0.14 },
    { score: 9, weight: 0.08 },
    { score: 10, weight: 0.02 },
  ],
  chapterJapan9: [
    { score: 4, weight: 0.06 },
    { score: 5, weight: 0.1 },
    { score: 6, weight: 0.16 },
    { score: 7, weight: 0.22 },
    { score: 8, weight: 0.22 },
    { score: 9, weight: 0.16 },
    { score: 10, weight: 0.08 },
  ],
  chapterUsa9: [
    { score: 5, weight: 0.08 },
    { score: 6, weight: 0.12 },
    { score: 7, weight: 0.18 },
    { score: 8, weight: 0.24 },
    { score: 9, weight: 0.2 },
    { score: 10, weight: 0.14 },
    { score: 0, weight: 0.04 },
  ],
};

export function getRivalProfile(modeId: ModeId): RivalProfile | null {
  if (modeId === 'practice6') {
    return null;
  }
  return RIVAL_PROFILE;
}

export function createRivalShot(modeId: ModeId, arrowIndex: number, random = Math.random): RivalShot | null {
  if (modeId === 'practice6') {
    return null;
  }

  const baseWeights = [...RIVAL_SCORE_WEIGHTS[modeId]];
  if (arrowIndex >= 6) {
    baseWeights.forEach((entry) => {
      if (entry.score >= 8) {
        entry.weight += 0.01;
      }
    });
  }

  const score = weightedPick(baseWeights, random);
  const sampled = sampleImpactForScore(modeId, score, random);
  const scored = scoreTarget(sampled.hitX, sampled.hitY);

  return {
    score: scored.score,
    isX: scored.isX,
    hitX: sampled.hitX,
    hitY: sampled.hitY,
  };
}

function weightedPick(weights: Array<{ score: number; weight: number }>, random: () => number): number {
  const total = weights.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random() * total;

  for (const item of weights) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.score;
    }
  }

  return weights[weights.length - 1]?.score ?? 0;
}

function sampleImpactForScore(modeId: Exclude<ModeId, 'practice6'>, score: number, random: () => number): { hitX: number; hitY: number } {
  if (score <= 0) {
    const angle = random() * Math.PI * 2;
    const radius = TARGET_RADIUS + 0.04 + random() * 0.08;
    return {
      hitX: Math.cos(angle) * radius,
      hitY: Math.sin(angle) * radius,
    };
  }

  if (score === 10) {
    const xChance = modeId === 'chapterUsa9' ? 0.16 : modeId === 'chapterJapan9' ? 0.1 : 0.06;
    const angle = random() * Math.PI * 2;
    const radius = random() < xChance ? random() * X_RING_RADIUS * 0.9 : X_RING_RADIUS + random() * Math.max(0.02, RING_WIDTH - X_RING_RADIUS - 0.01);
    return {
      hitX: Math.cos(angle) * radius,
      hitY: Math.sin(angle) * radius,
    };
  }

  const ringIndex = 10 - score;
  const inner = ringIndex * RING_WIDTH + 0.015;
  const outer = (ringIndex + 1) * RING_WIDTH - 0.018;
  const radius = inner + random() * Math.max(outer - inner, 0.016);
  const angle = random() * Math.PI * 2;
  return {
    hitX: Math.cos(angle) * radius,
    hitY: Math.sin(angle) * radius,
  };
}

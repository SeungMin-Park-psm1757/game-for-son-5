import type { MatchRecord } from '../types';

export interface ArrowTheme {
  tip: string;
  wrap: string;
  featherA: string;
  featherB: string;
  featherC: string;
}

export interface PlayerProgress {
  totalShots: number;
  level: number;
  levelLabel: string;
  tremorMultiplier: number;
  arrowTheme: ArrowTheme;
}

const LEVEL_THRESHOLDS = [0, 18, 54, 108, 180, 270];

const LEVEL_LABELS = ['새싹', '훈련병', '선수', '대표', '명궁', '전설'];

const ARROW_THEMES: ArrowTheme[] = [
  { tip: '#30343f', wrap: '#8b5e3c', featherA: '#d9485a', featherB: '#f0b13c', featherC: '#2f8f83' },
  { tip: '#8b5e3c', wrap: '#b76d2d', featherA: '#f97316', featherB: '#facc15', featherC: '#166534' },
  { tip: '#0f766e', wrap: '#115e59', featherA: '#34d399', featherB: '#fde68a', featherC: '#0f766e' },
  { tip: '#2563eb', wrap: '#1d4ed8', featherA: '#60a5fa', featherB: '#93c5fd', featherC: '#f8fafc' },
  { tip: '#d97706', wrap: '#b45309', featherA: '#f59e0b', featherB: '#fcd34d', featherC: '#fef3c7' },
  { tip: '#dc2626', wrap: '#991b1b', featherA: '#fb7185', featherB: '#fdba74', featherC: '#fde68a' },
];

export function getPlayerProgress(records: MatchRecord[], currentMatchShots = 0): PlayerProgress {
  const totalShots = records.reduce((sum, record) => sum + record.arrowScores.length, 0) + currentMatchShots;
  const level = getProgressLevel(totalShots);
  const levelIndex = Math.max(0, Math.min(level - 1, ARROW_THEMES.length - 1));

  return {
    totalShots,
    level,
    levelLabel: LEVEL_LABELS[levelIndex],
    tremorMultiplier: Math.max(0.74, 1 - levelIndex * 0.055),
    arrowTheme: ARROW_THEMES[levelIndex],
  };
}

function getProgressLevel(totalShots: number): number {
  let level = 1;

  for (let index = 0; index < LEVEL_THRESHOLDS.length; index += 1) {
    if (totalShots >= LEVEL_THRESHOLDS[index]) {
      level = index + 1;
    }
  }

  return level;
}

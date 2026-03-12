import type { ModeConfig, ModeId, ResultBand } from '../types';

export const MODES: Record<ModeId, ModeConfig> = {
  practice6: {
    id: 'practice6',
    chapterId: 'practice',
    title: '연습 6발',
    shortTitle: '연습',
    subtitle: '바람 약함',
    arrowCount: 6,
    ends: 2,
    description: '바람 약함 · 감각 확인',
    isChallenge: false,
    locationLabel: '연습장',
    badgeEmoji: '🎯',
    windDrift: 0.08,
    windClamp: 0.22,
    windInfluence: 0.7,
    tremorMultiplier: 0.9,
  },
  chapterKorea9: {
    id: 'chapterKorea9',
    chapterId: 'korea',
    title: '한국 기록전 9발',
    shortTitle: '한국',
    subtitle: '서울 · 바람 약함',
    arrowCount: 9,
    ends: 3,
    description: '서울 · 바람 약함 · 해금 66점',
    isChallenge: true,
    locationLabel: '한국',
    badgeEmoji: '🇰🇷',
    unlockScore: 66,
    nextMode: 'chapterJapan9',
    windDrift: 0.12,
    windClamp: 0.35,
    windInfluence: 0.95,
    tremorMultiplier: 1,
  },
  chapterJapan9: {
    id: 'chapterJapan9',
    chapterId: 'japan',
    title: '일본 기록전 9발',
    shortTitle: '일본',
    subtitle: '도쿄 · 횡풍 보통',
    arrowCount: 9,
    ends: 3,
    description: '도쿄 · 횡풍 보통 · 해금 72점',
    isChallenge: true,
    locationLabel: '일본',
    badgeEmoji: '🇯🇵',
    unlockScore: 72,
    nextMode: 'chapterUsa9',
    windDrift: 0.18,
    windClamp: 0.5,
    windInfluence: 1.15,
    tremorMultiplier: 1.08,
  },
  chapterUsa9: {
    id: 'chapterUsa9',
    chapterId: 'usa',
    title: '미국 기록전 9발',
    shortTitle: '미국',
    subtitle: 'LA · 횡풍 강함',
    arrowCount: 9,
    ends: 3,
    description: 'LA · 횡풍 강함 · 최종 챕터',
    isChallenge: true,
    locationLabel: '미국',
    badgeEmoji: '🇺🇸',
    windDrift: 0.24,
    windClamp: 0.68,
    windInfluence: 1.3,
    tremorMultiplier: 1.16,
  },
};

export const DEFAULT_UNLOCKED_MODES: ModeId[] = ['practice6', 'chapterKorea9'];
export const CHAPTER_MODE_IDS: ModeId[] = ['chapterKorea9', 'chapterJapan9', 'chapterUsa9'];

export function getModeConfig(modeId: ModeId): ModeConfig {
  return MODES[modeId];
}

export function getResultBand(modeId: ModeId, totalScore: number): ResultBand {
  const ratio = totalScore / (MODES[modeId].arrowCount * 10);

  if (ratio >= 0.88) {
    return 'gold';
  }
  if (ratio >= 0.76) {
    return 'silver';
  }
  if (ratio >= 0.6) {
    return 'bronze';
  }
  return 'encourage';
}

export function getUnlockedNextMode(modeId: ModeId, totalScore: number): ModeId | null {
  const mode = MODES[modeId];
  if (!mode.nextMode || !mode.unlockScore) {
    return null;
  }

  return totalScore >= mode.unlockScore ? mode.nextMode : null;
}

import type { ModeConfig, ModeId, ResultBand } from '../types';

export const MODES: Record<ModeId, ModeConfig> = {
  practice6: {
    id: 'practice6',
    chapterId: 'practice',
    title: '연습장 6발',
    shortTitle: '연습장',
    subtitle: '감각을 익히는 워밍업',
    arrowCount: 6,
    ends: 2,
    description: '바람이 거의 없는 연습장입니다. 확대 조준과 릴리스 타이밍을 먼저 익혀보세요.',
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
    title: '한국 경기 9발',
    shortTitle: '한국 경기',
    subtitle: '첫 국가대표 선발 무대',
    arrowCount: 9,
    ends: 3,
    description: '서울 경기장은 가장 차분한 바람으로 시작합니다. 다음 챕터를 열려면 66점 이상이 필요합니다.',
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
    title: '일본 경기 9발',
    shortTitle: '일본 경기',
    subtitle: '횡풍이 늘어나는 두 번째 챕터',
    arrowCount: 9,
    ends: 3,
    description: '도쿄 경기장은 좌우 바람이 더 자주 변합니다. 다음 챕터를 열려면 72점 이상이 필요합니다.',
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
    title: '미국 경기 9발',
    shortTitle: '미국 경기',
    subtitle: '가장 까다로운 결승 챕터',
    arrowCount: 9,
    ends: 3,
    description: '미국 챕터는 강한 바람과 긴장도가 함께 올라갑니다. 최종 기록을 명예의 전당에 남겨보세요.',
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

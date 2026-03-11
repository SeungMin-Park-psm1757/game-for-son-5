import type { ModeConfig, ModeId, ResultBand } from '../types';

export const MODES: Record<ModeId, ModeConfig> = {
  practice6: {
    id: 'practice6',
    title: '연습장 6발',
    subtitle: '입력감 확인',
    arrowCount: 6,
    ends: 2,
    description: '빠르게 손맛과 싱크를 확인하는 워밍업 모드입니다.',
    isChallenge: false,
  },
  trial12: {
    id: 'trial12',
    title: '대표 선발전 12발',
    subtitle: '첫 완성 모드',
    arrowCount: 12,
    ends: 4,
    description: '짧고 반복성이 좋아 Hall of Fame 기록 경쟁에 가장 잘 맞는 핵심 모드입니다.',
    isChallenge: true,
    unlockScore: 100,
  },
  ranking72: {
    id: 'ranking72',
    title: '랭킹 라운드 72발',
    subtitle: '장기전',
    arrowCount: 72,
    ends: 12,
    description: '데이터 구조는 준비되어 있고, 홈 진입 버튼만 열면 확장할 수 있습니다.',
    isChallenge: true,
  },
};

export const DEFAULT_UNLOCKED_MODES: ModeId[] = ['practice6', 'trial12'];

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

export function shouldUnlockRanking72(modeId: ModeId, totalScore: number): boolean {
  return modeId === 'trial12' && totalScore >= (MODES.trial12.unlockScore ?? Number.MAX_SAFE_INTEGER);
}

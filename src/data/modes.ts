import type { ModeConfig, ModeId, ResultBand } from '../types';

export const MODES: Record<ModeId, ModeConfig> = {
  practice6: {
    id: 'practice6',
    title: '연습장 6발',
    subtitle: '입력감 확인',
    arrowCount: 6,
    ends: 2,
    description: '짧게 한 판 즐기며 터치 조준과 릴리스 타이밍을 익히는 가벼운 모드입니다.',
    isChallenge: false,
  },
  trial12: {
    id: 'trial12',
    title: '대표 선발전 12발',
    subtitle: '반복 플레이용 메인 모드',
    arrowCount: 12,
    ends: 4,
    description: '명예의 전당 기록 경쟁에 가장 잘 맞는 짧고 밀도 높은 챌린지 모드입니다.',
    isChallenge: true,
    unlockScore: 100,
  },
  ranking72: {
    id: 'ranking72',
    title: '랭킹 라운드 72발',
    subtitle: '추후 확장',
    arrowCount: 72,
    ends: 12,
    description: '기록 구조는 이미 준비되어 있고, 향후 정식 랭킹 모드로 확장할 예정입니다.',
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

import { RING_WIDTH, TARGET_RADIUS, X_RING_RADIUS, scoreTarget } from '../game/Scoring';
import type { StoryEvent, StoryLine } from '../story/types';
import type { ModeId, RivalId } from '../types';
import type { PortraitKey } from './portraits';
import { getModeConfig } from './modes';

export interface RivalProfile {
  id: RivalId;
  name: string;
  title: string;
  accent: string;
  accentSoft: string;
  portraitKey: PortraitKey;
}

export interface RivalShot {
  score: number;
  isX: boolean;
  hitX: number;
  hitY: number;
}

const RIVAL_ROSTER: Record<RivalId, RivalProfile> = {
  siwoo: {
    id: 'siwoo',
    name: '시우',
    title: '축구 좋아하는 스피드형 친구',
    accent: '#0f766e',
    accentSoft: 'rgba(15, 118, 110, 0.14)',
    portraitKey: 'rival_siwoo',
  },
  siyeon: {
    id: 'siyeon',
    name: '시연',
    title: '말수 적고 템포가 빠른 라이벌',
    accent: '#2563eb',
    accentSoft: 'rgba(37, 99, 235, 0.14)',
    portraitKey: 'rival_siyeon',
  },
  jihwan: {
    id: 'jihwan',
    name: '지환',
    title: '분석 좋아하는 계산형 라이벌',
    accent: '#7c3aed',
    accentSoft: 'rgba(124, 58, 237, 0.14)',
    portraitKey: 'rival_jihwan',
  },
  junhong: {
    id: 'junhong',
    name: '준홍',
    title: '조용하지만 승부욕 강한 친구',
    accent: '#b45309',
    accentSoft: 'rgba(180, 83, 9, 0.14)',
    portraitKey: 'rival_junhong',
  },
  carbot: {
    id: 'carbot',
    name: '카봇',
    title: '정밀 계산으로 승부하는 로봇 라이벌',
    accent: '#374151',
    accentSoft: 'rgba(55, 65, 81, 0.14)',
    portraitKey: 'rival_carbot',
  },
  pororo: {
    id: 'pororo',
    name: '뽀로로',
    title: '호기심 많은 모험가 라이벌',
    accent: '#1d4ed8',
    accentSoft: 'rgba(29, 78, 216, 0.14)',
    portraitKey: 'rival_pororo',
  },
  loopy: {
    id: 'loopy',
    name: '루피',
    title: '상냥하지만 은근 승부욕 있는 라이벌',
    accent: '#db2777',
    accentSoft: 'rgba(219, 39, 119, 0.14)',
    portraitKey: 'rival_loopy',
  },
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

const RIVAL_DIALOGUES: Record<RivalId, (modeId: Exclude<ModeId, 'practice6'>) => StoryLine[]> = {
  siwoo: (modeId) => {
    const stage = getModeConfig(modeId).locationLabel;
    return [
      { speaker: '시우', portraitKey: 'rival_siwoo', text: `정우야, ${stage} 경기장까지 왔네. 오늘은 축구 말고 활로 승부다.` },
      { speaker: '정우', portraitKey: 'char_jeongwoo', text: '좋아. 공 대신 화살이어도 중심 노리는 건 똑같지.' },
      { speaker: '시우', portraitKey: 'rival_siwoo', text: '난 타이밍 승부에 자신 있어. 먼저 점수판부터 흔들어볼게.' },
      { speaker: '정우', portraitKey: 'char_jeongwoo', text: '난 호흡으로 따라갈게. 급하게만 안 쏘면 돼.' },
      { speaker: '시우', portraitKey: 'rival_siwoo', text: '좋아, 끝나고는 누가 더 멋진 표정으로 쐈는지도 같이 보자!' },
    ];
  },
  siyeon: (modeId) => {
    const stage = getModeConfig(modeId).locationLabel;
    return [
      { speaker: '시연', portraitKey: 'rival_siyeon', text: `${stage} 무대는 조용해서 좋네. 집중하기 딱이야.` },
      { speaker: '정우', portraitKey: 'char_jeongwoo', text: '응, 이런 데선 손끝 떨림도 더 잘 느껴지지.' },
      { speaker: '시연', portraitKey: 'rival_siyeon', text: '난 말 길게 안 할게. 대신 점수로 바로 보여줄 거야.' },
      { speaker: '정우', portraitKey: 'char_jeongwoo', text: '좋아. 나도 한 발 한 발로 대답해볼게.' },
      { speaker: '시연', portraitKey: 'rival_siyeon', text: '그럼 시작하자. 오늘은 조용한 쪽이 더 무서울지도 몰라.' },
    ];
  },
  jihwan: (modeId) => {
    const stage = getModeConfig(modeId).locationLabel;
    return [
      { speaker: '지환', portraitKey: 'rival_jihwan', text: `${stage} 챕터 데이터는 이미 다 봤어. 오늘 바람 패턴도 계산 끝.` },
      { speaker: '정우', portraitKey: 'char_jeongwoo', text: '난 계산보다 감각이 먼저야. 대신 내 리듬은 꽤 정확해.' },
      { speaker: '지환', portraitKey: 'rival_jihwan', text: '좋아. 계산이 이길지 감각이 이길지 확인해보자.' },
      { speaker: '정우', portraitKey: 'char_jeongwoo', text: '한 발씩 보면 알겠지. 나도 오늘 감이 좋아.' },
      { speaker: '지환', portraitKey: 'rival_jihwan', text: '결과가 어떻게 나와도 재밌겠네. 자, 실험 시작.' },
    ];
  },
  junhong: (modeId) => {
    const stage = getModeConfig(modeId).locationLabel;
    return [
      { speaker: '준홍', portraitKey: 'rival_junhong', text: `${stage}까지 올라왔으면 이제 장난은 끝이야.` },
      { speaker: '정우', portraitKey: 'char_jeongwoo', text: '괜찮아. 나도 여기선 진지하게 쏠 생각이야.' },
      { speaker: '준홍', portraitKey: 'rival_junhong', text: '난 조용히 쏘는 편인데, 점수판은 꽤 시끄럽게 만들지.' },
      { speaker: '정우', portraitKey: 'char_jeongwoo', text: '좋네. 그럼 나도 조용하게 따라붙어볼게.' },
      { speaker: '준홍', portraitKey: 'rival_junhong', text: '끝나고 누가 더 침착했는지 보자. 난 그게 제일 궁금해.' },
    ];
  },
  carbot: (modeId) => {
    const stage = getModeConfig(modeId).locationLabel;
    return [
      { speaker: '카봇', portraitKey: 'rival_carbot', text: `${stage} 경기 분석 완료. 바람, 거리, 긴장도 계산값 입력.` },
      { speaker: '정우', portraitKey: 'char_jeongwoo', text: '우와, 시작 전에 그렇게 많이 계산해?' },
      { speaker: '카봇', portraitKey: 'rival_carbot', text: '정답. 그러나 승패 변수에는 용기와 집중도도 포함.' },
      { speaker: '정우', portraitKey: 'char_jeongwoo', text: '그건 나도 자신 있어. 오늘은 사람 감각도 보여줄게.' },
      { speaker: '카봇', portraitKey: 'rival_carbot', text: '좋다. 라이벌전 프로토콜 시작. 서로 최고 성능으로 가자.' },
    ];
  },
  pororo: (modeId) => {
    const stage = getModeConfig(modeId).locationLabel;
    return [
      { speaker: '뽀로로', portraitKey: 'rival_pororo', text: `와! ${stage} 무대 진짜 신난다. 오늘은 내가 먼저 가운데를 찍어볼래!` },
      { speaker: '정우', portraitKey: 'char_jeongwoo', text: '좋아. 나도 쉽게 안 질 거야.' },
      { speaker: '뽀로로', portraitKey: 'rival_pororo', text: '모험도 좋지만 승부도 재밌거든! 내가 먼저 달려갈게.' },
      { speaker: '정우', portraitKey: 'char_jeongwoo', text: '그럼 난 차분하게 따라가면서 역전 타이밍을 볼게.' },
      { speaker: '뽀로로', portraitKey: 'rival_pororo', text: '좋아! 끝나고 누가 더 신나게 웃는지도 같이 보자!' },
    ];
  },
  loopy: (modeId) => {
    const stage = getModeConfig(modeId).locationLabel;
    return [
      { speaker: '루피', portraitKey: 'rival_loopy', text: `${stage} 분위기 예쁘다. 그런데 나 오늘은 꽤 진심이야.` },
      { speaker: '정우', portraitKey: 'char_jeongwoo', text: '나도 그래. 보기엔 부드러워도 승부는 승부지.' },
      { speaker: '루피', portraitKey: 'rival_loopy', text: '응, 그래서 더 깔끔하게 이기고 싶어. 떨지 않고 정확하게.' },
      { speaker: '정우', portraitKey: 'char_jeongwoo', text: '좋아. 나도 끝까지 침착하게 쏴볼게.' },
      { speaker: '루피', portraitKey: 'rival_loopy', text: '그럼 시작하자. 오늘은 예쁜 자세로도 충분히 강할 수 있다는 걸 보여줄래.' },
    ];
  },
};

export function parseRivalId(value: string | null): RivalId | null {
  if (!value) {
    return null;
  }

  return value in RIVAL_ROSTER ? (value as RivalId) : null;
}

export function pickRandomRival(modeId: ModeId, random = Math.random): RivalProfile | null {
  if (modeId === 'practice6') {
    return null;
  }

  const entries = Object.values(RIVAL_ROSTER);
  return entries[Math.floor(random() * entries.length)] ?? entries[0] ?? null;
}

export function getRivalProfile(modeId: ModeId, rivalId?: RivalId | null): RivalProfile | null {
  if (modeId === 'practice6') {
    return null;
  }

  if (rivalId && rivalId in RIVAL_ROSTER) {
    return RIVAL_ROSTER[rivalId];
  }

  return pickRandomRival(modeId);
}

export function createRivalIntroEvent(modeId: Exclude<ModeId, 'practice6'>, rivalId: RivalId): StoryEvent {
  return {
    id: `rival-intro-${rivalId}-${Date.now()}`,
    delivery: 'scene',
    priority: 1,
    trigger: { type: 'first_launch', mode: modeId },
    lines: RIVAL_DIALOGUES[rivalId](modeId),
  };
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
    const radius =
      random() < xChance
        ? random() * X_RING_RADIUS * 0.9
        : X_RING_RADIUS + random() * Math.max(0.02, RING_WIDTH - X_RING_RADIUS - 0.01);
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

import { PORTRAITS, type PortraitKey } from './portraits';

export type HomeSupportPortraitKey = Extract<PortraitKey, 'char_dad' | 'char_mom' | 'char_seyeon'>;

export interface HomeSupportSelection {
  portraitKey: HomeSupportPortraitKey;
  speaker: string;
  text: string;
}

const HOME_SUPPORT_MESSAGES: Record<HomeSupportPortraitKey, string[]> = {
  char_dad: [
    '한 발 한 발 모이면 기록도 산처럼 쌓인다.',
    '과녁은 도망 안 간다. 호흡부터 맞추자.',
    '오늘은 힘보다 리듬으로 가보자.',
    '좋은 선수는 흔들려도 표정이 안 흔들린다.',
    '괜찮다. 가운데는 끝까지 기다리는 편이다.',
    '바람이 불수록 자세가 더 빛난다.',
    '점수판보다 네 자세가 먼저 좋아지고 있다.',
    '급하게 쏘지 마라. 과녁은 늘 거기 있다.',
    '한 번 맞힌 감각은 몸이 기억한다.',
    '오늘 기록은 아빠가 제일 먼저 저장해둘게.',
  ],
  char_mom: [
    '숨을 길게 내쉬고, 어깨부터 풀어보자.',
    '조준은 천천히 해도 괜찮아. 손끝은 늦지 않아.',
    '지금도 충분히 잘하고 있어. 조금만 더 차분하게.',
    '흔들릴수록 눈은 더 부드럽게 두자.',
    '서두르지 말고 좋은 순간을 기다리자.',
    '결과보다 자세가 먼저 정리되면 점수는 따라온다.',
    '이번 발은 네 박자대로 쏘면 된다.',
    '마음이 급하면 손끝이 먼저 안다. 같이 숨 고르자.',
    '과녁 가운데를 보기 전에 네 중심부터 찾자.',
    '오늘은 네가 만든 리듬을 끝까지 믿어보자.',
  ],
  char_seyeon: [
    '오빠, 이번엔 진짜 중앙에 꽂힐 것 같아!',
    '좋아 좋아, 지금 감각 완전 올라왔어!',
    '이번 발 들어가면 내가 제일 크게 환호할게!',
    '헉, 벌써 명예의 전당 냄새 난다!',
    '지금 폼이면 과녁이 먼저 긴장하겠다!',
    '딱 좋다! 그 순간만 잡으면 된다!',
    '오늘은 진짜 레전드 샷 나올 분위기야!',
    '좋아, 방금 손끝 반응 완전 선수 같았어!',
    '이번엔 내가 속보 띄워줄 준비 다 했어!',
    '한 번만 더 깔끔하게 가면 진짜 멋있겠다!',
  ],
};

export function createHomeSupportSession(random = Math.random): HomeSupportSelection[] {
  return (Object.keys(HOME_SUPPORT_MESSAGES) as HomeSupportPortraitKey[]).map((portraitKey) => {
    const messages = HOME_SUPPORT_MESSAGES[portraitKey];
    const text = messages[Math.floor(random() * messages.length)];

    return {
      portraitKey,
      speaker: PORTRAITS[portraitKey].label,
      text,
    };
  });
}

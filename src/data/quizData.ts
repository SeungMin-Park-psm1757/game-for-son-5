import type { ModeId } from '../types';
import { SPELLING_QUIZZES, type SpellingQuestion } from './spellingQuizData';

export type QuizType = 'math' | 'spelling' | 'dictation';

interface QuizBase {
  type: QuizType;
  title: string;
  description: string;
}

export interface MathQuizChallenge extends QuizBase {
  type: 'math';
  left: number;
  right: number;
  operator: '+' | '-' | '×';
  correctAnswer: number;
  choices: number[];
}

export interface SpellingQuizChallenge extends QuizBase {
  type: 'spelling';
  question: SpellingQuestion;
  choices: string[];
}

export interface DictationQuizChallenge extends QuizBase {
  type: 'dictation';
  targetWord: string;
}

export type QuizChallenge = MathQuizChallenge | SpellingQuizChallenge | DictationQuizChallenge;

export const DICTATION_WORDS = [
  '빛나라',
  '잡혀라',
  '신난다',
  '즐겁다',
  '행복해',
  '반짝반짝',
  '멋지다',
  '최고야',
  '힘내자',
  '영차영차',
  '물고기',
  '바다몽',
  '기쁘다',
  '사랑해',
  '웃자웃어',
  '함께해',
  '파이팅',
  '건강해',
  '씩씩하게',
  '고마워',
] as const;

export function pickQuizType(modeId: ModeId, randomValue = Math.random()): QuizType {
  if (modeId === 'practice6') {
    return 'math';
  }

  if (modeId === 'chapterKorea9') {
    if (randomValue < 0.6) {
      return 'math';
    }
    if (randomValue < 0.85) {
      return 'spelling';
    }
    return 'dictation';
  }

  if (modeId === 'chapterJapan9') {
    if (randomValue < 0.25) {
      return 'math';
    }
    if (randomValue < 0.75) {
      return 'spelling';
    }
    return 'dictation';
  }

  if (randomValue < 0.2) {
    return 'math';
  }
  if (randomValue < 0.55) {
    return 'spelling';
  }
  return 'dictation';
}

export function buildQuizChallenge(modeId: ModeId, random = Math.random): QuizChallenge {
  const type = pickQuizType(modeId, random());
  return buildQuizChallengeForType(type, modeId, random);
}

export function buildQuizChallengeForType(type: QuizType, modeId: ModeId, random = Math.random): QuizChallenge {
  switch (type) {
    case 'math':
      return createMathQuizChallenge(modeId, random);
    case 'spelling':
      return createSpellingQuizChallenge(modeId, random);
    case 'dictation':
      return createDictationQuizChallenge(modeId, random);
  }
}

export function createMathQuizChallenge(modeId: ModeId, random = Math.random): MathQuizChallenge {
  const advanced = modeId === 'chapterUsa9';
  let left = 0;
  let right = 0;
  let operator: MathQuizChallenge['operator'] = '+';
  let correctAnswer = 0;

  if (advanced) {
    const opType = random();
    if (opType < 0.33) {
      left = randomInt(2, 5, random);
      right = randomInt(1, 9, random);
      operator = '×';
      correctAnswer = left * right;
    } else if (opType < 0.66) {
      left = randomInt(10, 30, random);
      right = randomInt(5, 20, random);
      operator = '+';
      correctAnswer = left + right;
    } else {
      left = randomInt(15, 35, random);
      right = randomInt(5, 15, random);
      if (right > left) {
        [left, right] = [right, left];
      }
      operator = '-';
      correctAnswer = left - right;
    }
  } else {
    const first = randomInt(3, 12, random);
    const second = randomInt(1, 8, random);
    const isAddition = random() > 0.5;
    left = Math.max(first, second);
    right = Math.min(first, second);
    operator = isAddition ? '+' : '-';
    correctAnswer = isAddition ? left + right : left - right;
  }

  const offsetMax = advanced ? 8 : 5;
  const choices = new Set<number>([correctAnswer]);
  while (choices.size < 4) {
    const offset = randomInt(1, offsetMax, random);
    const direction = random() > 0.5 ? 1 : -1;
    choices.add(Math.max(0, correctAnswer + offset * direction));
  }

  return {
    type: 'math',
    title: advanced ? '기록전 계산 퀴즈' : '숫자 계산 퀴즈',
    description: '틀려도 한 번 더 생각할 수 있어요.',
    left,
    right,
    operator,
    correctAnswer,
    choices: shuffle([...choices], random),
  };
}

export function createSpellingQuizChallenge(modeId: ModeId = 'chapterKorea9', random = Math.random): SpellingQuizChallenge {
  const pool =
    modeId === 'chapterUsa9'
      ? SPELLING_QUIZZES
      : modeId === 'chapterJapan9'
        ? SPELLING_QUIZZES.slice(10)
        : SPELLING_QUIZZES.slice(0, 28);
  const question = pool[Math.floor(random() * pool.length)] ?? pool[0] ?? SPELLING_QUIZZES[0];
  return {
    type: 'spelling',
    title: '받침 맞춤법 퀴즈',
    description: modeId === 'chapterUsa9' ? '한 번 더 집중해서 낱말을 골라 보세요.' : '음성을 듣고 빈칸에 들어갈 말을 골라 보세요.',
    question,
    choices: shuffle([...question.choices], random),
  };
}

export function createDictationQuizChallenge(modeId: ModeId = 'chapterKorea9', random = Math.random): DictationQuizChallenge {
  const pool =
    modeId === 'chapterUsa9'
      ? DICTATION_WORDS.filter((word) => word.length >= 4)
      : modeId === 'chapterJapan9'
        ? DICTATION_WORDS.filter((word) => word.length >= 3)
        : DICTATION_WORDS.filter((word) => word.length <= 4);
  const targetWord = pool[Math.floor(random() * pool.length)] ?? pool[0] ?? DICTATION_WORDS[0];
  return {
    type: 'dictation',
    title: '받아쓰기 퀴즈',
    description: modeId === 'chapterUsa9' ? '빠르게 듣고 정확히 적어 보세요.' : '들리는 말을 그대로 적어 보세요.',
    targetWord,
  };
}

function randomInt(min: number, max: number, random: () => number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

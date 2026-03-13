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

  if (randomValue < 1 / 3) {
    return 'math';
  }
  if (randomValue < 2 / 3) {
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
      return createSpellingQuizChallenge(random);
    case 'dictation':
      return createDictationQuizChallenge(random);
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

export function createSpellingQuizChallenge(random = Math.random): SpellingQuizChallenge {
  const question = SPELLING_QUIZZES[Math.floor(random() * SPELLING_QUIZZES.length)] ?? SPELLING_QUIZZES[0];
  return {
    type: 'spelling',
    title: '받침 맞춤법 퀴즈',
    description: '음성을 듣고 빈칸에 들어갈 말을 골라 보세요.',
    question,
    choices: shuffle([...question.choices], random),
  };
}

export function createDictationQuizChallenge(random = Math.random): DictationQuizChallenge {
  const targetWord = DICTATION_WORDS[Math.floor(random() * DICTATION_WORDS.length)] ?? DICTATION_WORDS[0];
  return {
    type: 'dictation',
    title: '받아쓰기 퀴즈',
    description: '들리는 말을 그대로 적어 보세요.',
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

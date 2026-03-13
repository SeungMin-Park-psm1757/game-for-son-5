import { describe, expect, it } from 'vitest';
import { buildQuizChallengeForType, createDictationQuizChallenge, createMathQuizChallenge, createSpellingQuizChallenge, pickQuizType } from '../data/quizData';

describe('quiz challenge generation', () => {
  it('locks practice mode to math quizzes', () => {
    expect(pickQuizType('practice6', 0.9)).toBe('math');
    expect(buildQuizChallengeForType('math', 'practice6').type).toBe('math');
  });

  it('creates math quizzes with four unique choices including the answer', () => {
    const values = [0.4, 0.1, 0.2, 0.9, 0.7, 0.3, 0.6, 0.8, 0.5, 0.15, 0.95];
    let index = 0;
    const random = () => values[index++ % values.length] ?? 0.5;
    const quiz = createMathQuizChallenge('chapterKorea9', random);

    expect(quiz.choices).toHaveLength(4);
    expect(new Set(quiz.choices).size).toBe(4);
    expect(quiz.choices).toContain(quiz.correctAnswer);
    expect(quiz.correctAnswer).toBeGreaterThanOrEqual(0);
  });

  it('uses multiplication in advanced math quizzes when selected', () => {
    const values = [0.1, 0.4, 0.6, 0.3, 0.2, 0.8, 0.5, 0.7, 0.9];
    let index = 0;
    const random = () => values[index++ % values.length] ?? 0.5;
    const quiz = createMathQuizChallenge('chapterUsa9', random);

    expect(['+', '-', '×']).toContain(quiz.operator);
    expect(quiz.choices).toContain(quiz.correctAnswer);
  });

  it('creates spelling quizzes from the imported dataset', () => {
    const quiz = createSpellingQuizChallenge(() => 0);
    expect(quiz.question.id).toBe('spelling-01');
    expect(quiz.choices).toContain(quiz.question.answer);
  });

  it('creates dictation quizzes from the legacy word list', () => {
    const quiz = createDictationQuizChallenge(() => 0);
    expect(quiz.targetWord).toBe('빛나라');
  });
});

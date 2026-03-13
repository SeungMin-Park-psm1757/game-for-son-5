import { afterEach, describe, expect, it, vi } from 'vitest';
import { presentQuizGate } from '../ui/QuizGate';

describe('quiz gate', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('opens a math gate for practice mode and resolves on a correct answer', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.append(host);

    const promise = presentQuizGate(host, { modeId: 'practice6' });
    const question = host.querySelector<HTMLElement>('.quiz-question');
    expect(question?.textContent).toBeTruthy();

    const match = question?.textContent?.match(/(\d+)\s([+\-×])\s(\d+)\s=\s\?/);
    expect(match).toBeTruthy();
    const [, leftText, operator, rightText] = match as RegExpMatchArray;
    const left = Number(leftText);
    const right = Number(rightText);
    const answer = operator === '+' ? left + right : operator === '-' ? left - right : left * right;

    const button = [...host.querySelectorAll<HTMLButtonElement>('.choice-btn')].find((item) => Number(item.textContent) === answer);
    expect(button).toBeTruthy();

    button?.click();
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toBe(true);
    expect(host.querySelector('.quiz-gate-scrim')).toBeNull();
  });
});

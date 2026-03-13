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

  it('gives one more chance, then reveals the answer and offers a retry', async () => {
    const host = document.createElement('div');
    document.body.append(host);

    void presentQuizGate(host, { modeId: 'practice6' });
    const question = host.querySelector<HTMLElement>('.quiz-question');
    expect(question?.textContent).toBeTruthy();

    const match = question?.textContent?.match(/(\d+)\s([+\-×])\s(\d+)\s=\s\?/);
    expect(match).toBeTruthy();
    const [, leftText, operator, rightText] = match as RegExpMatchArray;
    const left = Number(leftText);
    const right = Number(rightText);
    const answer = operator === '+' ? left + right : operator === '-' ? left - right : left * right;

    const buttons = [...host.querySelectorAll<HTMLButtonElement>('.choice-btn')];
    const wrongButtons = buttons.filter((button) => Number(button.textContent) !== answer);
    expect(wrongButtons.length).toBeGreaterThanOrEqual(2);

    wrongButtons[0]?.click();
    const firstFeedback = host.querySelector<HTMLElement>('.quiz-gate-feedback');
    expect(firstFeedback?.dataset.tone).toBe('hint');
    expect(firstFeedback?.textContent).toContain('한 번 더');
    expect(host.querySelector<HTMLElement>('.quiz-gate-actions')?.hidden).toBe(true);

    const secondWrong = [...host.querySelectorAll<HTMLButtonElement>('.choice-btn')].find(
      (button) => !button.disabled && Number(button.textContent) !== answer,
    );
    expect(secondWrong).toBeTruthy();
    secondWrong?.click();

    const secondFeedback = host.querySelector<HTMLElement>('.quiz-gate-feedback');
    expect(secondFeedback?.dataset.tone).toBe('error');
    expect(secondFeedback?.textContent).toContain(String(answer));
    expect(host.querySelector<HTMLElement>('.quiz-gate-actions')?.hidden).toBe(false);
  });
});

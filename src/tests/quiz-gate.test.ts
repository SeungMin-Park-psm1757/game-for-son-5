import { afterEach, describe, expect, it, vi } from 'vitest';
import { presentQuizGate } from '../ui/QuizGate';

describe('quiz gate', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('requires two different quiz types before resolving', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.append(host);

    let settled = false;
    const promise = presentQuizGate(host, { modeId: 'practice6' }).then((result) => {
      settled = true;
      return result;
    });

    solveMathQuestion(host);
    await vi.advanceTimersByTimeAsync(1300);

    expect(settled).toBe(false);
    expect(host.querySelector('.quiz-input')).not.toBeNull();
    expect(host.querySelector('.quiz-gate-progress')?.textContent).toContain('2 / 2');

    const promptText = host.querySelector('.quiz-word-card')?.textContent ?? '';
    const targetWord = promptText.split(':').at(-1)?.trim();
    expect(targetWord).toBeTruthy();

    const input = host.querySelector<HTMLInputElement>('.quiz-input');
    const submit = host.querySelector<HTMLButtonElement>('.quiz-input-row .primary-button');
    expect(input).toBeTruthy();
    expect(submit).toBeTruthy();

    input!.value = targetWord!;
    submit!.click();
    await vi.advanceTimersByTimeAsync(1300);

    await expect(promise).resolves.toBe(true);
    expect(host.querySelector('.quiz-gate-scrim')).toBeNull();
  });

  it('gives one more chance, then reveals the answer and offers a retry', async () => {
    const host = document.createElement('div');
    document.body.append(host);

    void presentQuizGate(host, { modeId: 'practice6' });
    const question = host.querySelector<HTMLElement>('.quiz-question');
    expect(question?.textContent).toBeTruthy();

    const { answer } = parseMathQuestion(question?.textContent ?? '');
    const buttons = [...host.querySelectorAll<HTMLButtonElement>('.choice-btn')];
    const wrongButtons = buttons.filter((button) => Number(button.textContent) !== answer);
    expect(wrongButtons.length).toBeGreaterThanOrEqual(2);

    wrongButtons[0]?.click();
    const firstFeedback = host.querySelector<HTMLElement>('.quiz-gate-feedback');
    expect(firstFeedback?.dataset.tone).toBe('hint');
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

function solveMathQuestion(host: HTMLElement): void {
  const question = host.querySelector<HTMLElement>('.quiz-question');
  const { answer } = parseMathQuestion(question?.textContent ?? '');
  const button = [...host.querySelectorAll<HTMLButtonElement>('.choice-btn')].find((item) => Number(item.textContent) === answer);
  expect(button).toBeTruthy();
  button?.click();
}

function parseMathQuestion(text: string): { answer: number } {
  const match = text.match(/(\d+)\s(\S)\s(\d+)\s=\s\?/);
  expect(match).toBeTruthy();
  const [, leftText, operator, rightText] = match as RegExpMatchArray;
  const left = Number(leftText);
  const right = Number(rightText);
  const answer = operator === '+' ? left + right : operator === '-' ? left - right : left * right;
  return { answer };
}

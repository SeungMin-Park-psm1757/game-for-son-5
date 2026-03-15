import {
  buildQuizChallengeForType,
  buildQuizRun,
  type DictationQuizChallenge,
  type MathQuizChallenge,
  type QuizChallenge,
  type QuizType,
  type SpellingQuizChallenge,
} from '../data/quizData';
import type { ModeId } from '../types';
import { clearNode, element } from './dom';

interface QuizGateOptions {
  modeId: ModeId;
}

export async function presentQuizGate(host: HTMLElement, options: QuizGateOptions): Promise<boolean> {
  const challenges = buildQuizRun(options.modeId, 2);

  return new Promise<boolean>((resolve) => {
    const scrim = element('div', 'modal-scrim quiz-gate-scrim');
    const card = element('div', 'modal-card quiz-gate-card');
    const header = element('div', 'quiz-gate-header');
    const headerText = element('div');
    const headerMeta = element('div', 'quiz-gate-meta');
    const eyebrow = element('span', 'eyebrow');
    const progress = element('span', 'topbar-pill quiz-gate-progress');
    const title = element('h2', 'section-title');
    const description = element('p', 'muted-text quiz-gate-description');
    const closeButton = element('button', 'topbar-icon-button', '\ub2eb\uae30');
    const body = element('div', 'quiz-gate-body');
    const feedback = element('div', 'quiz-gate-feedback');
    const actions = element('div', 'quiz-gate-actions');
    const retryButton = element('button', 'primary-button', '\ub2e4\uc2dc \ud480\uae30');
    const homeButton = element('button', 'secondary-button', '\uba54\uc778\uc73c\ub85c');

    let activeType: QuizType = challenges[0]?.type ?? 'math';
    let activeIndex = 0;
    let resolved = false;
    let transitionTimer = 0;

    const cleanup = () => {
      if (transitionTimer) {
        window.clearTimeout(transitionTimer);
        transitionTimer = 0;
      }
      stopSpeech();
      scrim.remove();
    };

    const finish = (result: boolean) => {
      if (resolved) {
        return;
      }

      resolved = true;
      cleanup();
      resolve(result);
    };

    const revealFeedback = () => {
      feedback.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    };

    const showRetryActions = () => {
      actions.hidden = false;
      revealFeedback();
    };

    const setFeedback = (message: string, tone: 'success' | 'hint' | 'error') => {
      if (resolved) {
        return;
      }
      feedback.dataset.tone = tone;
      feedback.textContent = message;
      feedback.hidden = false;
      revealFeedback();
    };

    const moveToNextChallenge = () => {
      if (resolved) {
        return;
      }
      if (activeIndex >= challenges.length - 1) {
        setFeedback('\uc815\ub2f5! \uc900\ube44 \uc644\ub8cc, \uacbd\uae30\ub85c \ucd9c\ubc1c\ud574\uc694.', 'success');
        transitionTimer = window.setTimeout(() => finish(true), 760);
        return;
      }

      setFeedback(
        `\uc815\ub2f5! ${activeIndex + 1}/${challenges.length} \ud1b5\uacfc. \ub2e4\uc74c \uc900\ube44 \ubb38\uc81c\ub85c \uac08\uac8c\uc694.`,
        'success',
      );
      transitionTimer = window.setTimeout(() => {
        activeIndex += 1;
        renderChallenge(challenges[activeIndex] ?? challenges[0]);
      }, 700);
    };

    const renderChallenge = (challenge: QuizChallenge) => {
      if (resolved) {
        return;
      }
      if (transitionTimer) {
        window.clearTimeout(transitionTimer);
        transitionTimer = 0;
      }

      clearNode(body);
      feedback.hidden = true;
      feedback.textContent = '';
      actions.hidden = true;
      stopSpeech();

      activeType = challenge.type;
      eyebrow.textContent = getTypeLabel(challenge.type);
      progress.textContent = `\uc900\ube44 ${activeIndex + 1} / ${challenges.length}`;
      title.textContent = challenge.title;
      description.textContent = challenge.description;

      if (challenge.type === 'math') {
        renderMathChallenge(body, challenge, setFeedback, showRetryActions, moveToNextChallenge);
        return;
      }

      if (challenge.type === 'spelling') {
        renderSpellingChallenge(body, challenge, setFeedback, showRetryActions, moveToNextChallenge);
        return;
      }

      renderDictationChallenge(body, challenge, setFeedback, showRetryActions, moveToNextChallenge);
    };

    headerMeta.append(eyebrow, progress);
    headerText.append(headerMeta, title, description);
    header.append(headerText, closeButton);
    actions.append(retryButton, homeButton);
    card.append(header, body, feedback, actions);
    scrim.append(card);
    host.append(scrim);

    closeButton.addEventListener('click', () => finish(false));
    homeButton.addEventListener('click', () => finish(false));
    scrim.addEventListener('click', (event) => {
      if (event.target === scrim) {
        finish(false);
      }
    });

    retryButton.addEventListener('click', () => {
      renderChallenge(buildQuizChallengeForType(activeType, options.modeId));
    });

    renderChallenge(challenges[0] ?? buildQuizChallengeForType('math', options.modeId));
  });
}

function renderMathChallenge(
  host: HTMLElement,
  challenge: MathQuizChallenge,
  setFeedback: (message: string, tone: 'success' | 'hint' | 'error') => void,
  showRetryActions: () => void,
  onSuccess: () => void,
): void {
  const iconArea = element('div', 'quiz-icon-area');
  const leftGroup = element('div', 'quiz-fish-group');
  const operator = element('div', 'quiz-operator', challenge.operator);
  const rightGroup = element('div', 'quiz-fish-group');
  const equal = element('div', 'quiz-operator', '=');
  const answerMark = element('div', 'quiz-answer-mark', '?');

  for (let index = 0; index < challenge.left; index += 1) {
    leftGroup.append(element('span', 'quiz-fish-icon', '\ud83c\udfaf'));
  }

  for (let index = 0; index < challenge.right; index += 1) {
    rightGroup.append(element('span', 'quiz-fish-icon', '\ud83c\udfaf'));
  }

  iconArea.append(leftGroup, operator, rightGroup, equal, answerMark);

  const question = element('p', 'quiz-question', `${challenge.left} ${challenge.operator} ${challenge.right} = ?`);
  const choiceGrid = element('div', 'quiz-choices quiz-choice-grid');
  let usedSecondChance = false;

  const buttons = challenge.choices.map((value) => {
    const button = element('button', 'choice-btn');
    button.type = 'button';
    button.dataset.answer = value.toString();
    button.textContent = value.toString();
    button.addEventListener('click', () => {
      const selected = Number(button.dataset.answer);
      if (button.disabled) {
        return;
      }

      if (selected === challenge.correctAnswer) {
        buttons.forEach((item) => {
          item.disabled = true;
        });
        button.dataset.state = 'correct';
        setFeedback(
          usedSecondChance
            ? '\uc815\ub2f5! \ub2e4\uc2dc \ucc28\ubd84\ud788 \ub9de\ucdb0\uc11c \uc88b\uc558\uc5b4\uc694.'
            : '\uc815\ub2f5! \ud750\ub984 \uc88b\uc544\uc694.',
          'success',
        );
        window.setTimeout(onSuccess, 520);
        return;
      }

      button.disabled = true;
      button.dataset.state = 'wrong';

      if (!usedSecondChance) {
        usedSecondChance = true;
        const removable = buttons.filter((item) => item !== button && !item.disabled && Number(item.dataset.answer) !== challenge.correctAnswer);
        const eliminated = removable[Math.floor(Math.random() * removable.length)];
        if (eliminated) {
          eliminated.disabled = true;
          eliminated.dataset.state = 'eliminated';
          eliminated.textContent = 'X';
        }
        setFeedback('\uad1c\ucc2e\uc544\uc694. \ubcf4\uae30 \ud558\ub098\ub97c \uc9c0\uc6e0\uc5b4\uc694. \ud55c \ubc88 \ub354 \uc0dd\uac01\ud574 \ubd10\uc694.', 'hint');
        return;
      }

      buttons.forEach((item) => {
        item.disabled = true;
        if (Number(item.dataset.answer) === challenge.correctAnswer) {
          item.dataset.state = 'correct';
        }
      });
      setFeedback(`\uc774\ubc88 \ubb38\uc81c\uc758 \uc815\ub2f5\uc740 ${challenge.correctAnswer}\uc608\uc694. \ub2e4\uc2dc \ud480\uace0 \ub4e4\uc5b4\uac00\uc694.`, 'error');
      showRetryActions();
    });
    choiceGrid.append(button);
    return button;
  });

  host.append(iconArea, question, choiceGrid);
}

function renderSpellingChallenge(
  host: HTMLElement,
  challenge: SpellingQuizChallenge,
  setFeedback: (message: string, tone: 'success' | 'hint' | 'error') => void,
  showRetryActions: () => void,
  onSuccess: () => void,
): void {
  const audioRow = element('div', 'quiz-audio-row');
  const replay = element('button', 'secondary-button quiz-replay-button', supportsSpeech() ? '\ub2e4\uc2dc \ub4e3\uae30' : '\uc74c\uc131 \uc5c6\uc74c');
  replay.toggleAttribute('disabled', !supportsSpeech());
  const count = element('span', 'topbar-pill', `\ubcf4\uae30 ${challenge.choices.length}\uac1c`);
  audioRow.append(replay, count);

  const promptCard = element('div', 'quiz-word-card');
  promptCard.innerHTML = `<strong>\ub9de\ucda4\ubc95 \ubb38\uc81c</strong><p>${challenge.question.promptText}</p>`;

  const choiceGrid = element('div', 'quiz-choices quiz-choice-grid');
  let usedSecondChance = false;
  const buttons = challenge.choices.map((choice) => {
    const button = element('button', 'choice-btn');
    button.type = 'button';
    button.dataset.choice = choice;
    button.textContent = choice;
    button.addEventListener('click', () => {
      if (button.disabled) {
        return;
      }

      const isCorrect = choice === challenge.question.answer;
      if (isCorrect) {
        buttons.forEach((item) => {
          item.disabled = true;
          if (item.dataset.choice === challenge.question.answer) {
            item.dataset.state = 'correct';
          }
        });
        setFeedback(`\uc815\ub2f5! "${challenge.question.answer}"\uac00 \ub9de\uc544\uc694.`, 'success');
        window.setTimeout(onSuccess, 520);
        return;
      }

      button.dataset.state = 'wrong';
      if (!usedSecondChance) {
        usedSecondChance = true;
        button.disabled = true;
        const removable = buttons.filter((item) => item !== button && !item.disabled && item.dataset.choice !== challenge.question.answer);
        const eliminated = removable[Math.floor(Math.random() * removable.length)];
        if (eliminated) {
          eliminated.disabled = true;
          eliminated.dataset.state = 'eliminated';
          eliminated.textContent = 'X';
        }
        setFeedback('\ud78c\ud2b8\ub97c \ub354 \ub4dc\ub9b4\uac8c\uc694. \uc624\ub2f5 \ud558\ub098\ub97c \uc9c0\uc6e0\uc5b4\uc694.', 'hint');
        return;
      }

      buttons.forEach((item) => {
        item.disabled = true;
        if (item.dataset.choice === challenge.question.answer) {
          item.dataset.state = 'correct';
        }
      });
      setFeedback(`\uc815\ub2f5\uc740 "${challenge.question.answer}"\uc608\uc694. \ub2e4\uc2dc \ud480\uace0 \ud76c\ub9dd\ucc28\uac8c \ub4e4\uc5b4\uac00\uc694.`, 'error');
      showRetryActions();
    });
    choiceGrid.append(button);
    return button;
  });

  replay.addEventListener('click', () => {
    speakText(challenge.question.spokenText);
  });

  host.append(audioRow, promptCard, choiceGrid);
  window.setTimeout(() => {
    speakText(challenge.question.spokenText);
  }, 120);
}

function renderDictationChallenge(
  host: HTMLElement,
  challenge: DictationQuizChallenge,
  setFeedback: (message: string, tone: 'success' | 'hint' | 'error') => void,
  showRetryActions: () => void,
  onSuccess: () => void,
): void {
  const audioRow = element('div', 'quiz-audio-row');
  const replay = element('button', 'secondary-button quiz-replay-button', supportsSpeech() ? '\ub2e4\uc2dc \ub4e3\uae30' : '\ub2e8\uc5b4 \ubcf4\uae30');
  const hint = element('span', 'topbar-pill', `\uae00\uc790 \uc218 ${challenge.targetWord.length}`);
  audioRow.append(replay, hint);

  const promptCard = element('div', 'quiz-word-card');
  promptCard.innerHTML = supportsSpeech()
    ? '<strong>\ubc1b\uc544\uc4f0\uae30</strong><p>\uc74c\uc131\uc744 \ub4e3\uace0 \uc544\ub798 \uce78\uc5d0 \uadf8\ub300\ub85c \uc801\uc5b4 \ubcf4\uc138\uc694.</p>'
    : `<strong>\ubc1b\uc544\uc4f0\uae30</strong><p>\uc774 \ube0c\ub77c\uc6b0\uc800\uc5d0\uc11c\ub294 \uc74c\uc131\uc774 \uc5c6\uc5b4 \ub2e8\uc5b4\ub97c \ubcf4\uc5ec\ub4dc\ub9b4\uac8c\uc694: ${challenge.targetWord}</p>`;

  const inputRow = element('div', 'quiz-input-row');
  const input = element('input', 'quiz-input') as HTMLInputElement;
  input.type = 'text';
  input.placeholder = '\ub2e8\uc5b4\ub97c \uc785\ub825\ud574\uc8fc\uc138\uc694';
  input.autocomplete = 'off';
  const submit = element('button', 'primary-button', '\ud655\uc778');
  inputRow.append(input, submit);
  let usedSecondChance = false;

  const check = () => {
    if (submit.disabled) {
      return;
    }

    const value = input.value.trim();
    if (value === challenge.targetWord) {
      input.disabled = true;
      submit.disabled = true;
      input.dataset.state = 'correct';
      setFeedback('\uc815\ub2f5! \ubc1b\uc544\uc4f0\uae30\uae4c\uc9c0 \ud1b5\uacfc\ud588\uc5b4\uc694.', 'success');
      window.setTimeout(onSuccess, 520);
      return;
    }

    if (!usedSecondChance) {
      usedSecondChance = true;
      input.dataset.state = 'wrong';
      input.value = '';
      input.focus();
      setFeedback(`\ud78c\ud2b8! \uae00\uc790 \uc218\ub294 ${challenge.targetWord.length}\uc790\uc608\uc694.`, 'hint');
      return;
    }

    input.disabled = true;
    submit.disabled = true;
    input.dataset.state = 'wrong';
    setFeedback(`\uc815\ub2f5\uc740 "${challenge.targetWord}"\uc608\uc694. \ub2e4\uc2dc \ud480\uace0 \ub2e4\uc2dc \ub3c4\uc804\ud574\uc694.`, 'error');
    showRetryActions();
  };

  replay.addEventListener('click', () => {
    if (supportsSpeech()) {
      speakText(challenge.targetWord);
      return;
    }

    promptCard.innerHTML = `<strong>\ubc1b\uc544\uc4f0\uae30</strong><p>${challenge.targetWord}</p>`;
  });

  submit.addEventListener('click', check);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      check();
    }
  });

  host.append(audioRow, promptCard, inputRow);
  window.setTimeout(() => {
    if (supportsSpeech()) {
      speakText(challenge.targetWord);
    }
    input.focus();
  }, 120);
}

function getTypeLabel(type: QuizType): string {
  switch (type) {
    case 'math':
      return '\uc22b\uc790 \uacc4\uc0b0 \ud034\uc988';
    case 'spelling':
      return '\ub9de\ucda4\ubc95 \ud034\uc988';
    case 'dictation':
      return '\ubc1b\uc544\uc4f0\uae30 \ud034\uc988';
  }
}

function supportsSpeech(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

function speakText(text: string): void {
  if (!supportsSpeech()) {
    return;
  }

  stopSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
}

function stopSpeech(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  window.speechSynthesis.cancel();
}

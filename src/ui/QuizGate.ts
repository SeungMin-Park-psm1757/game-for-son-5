import { buildQuizChallenge, buildQuizChallengeForType, type DictationQuizChallenge, type MathQuizChallenge, type QuizChallenge, type QuizType, type SpellingQuizChallenge } from '../data/quizData';
import type { ModeId } from '../types';
import { clearNode, element } from './dom';

interface QuizGateOptions {
  modeId: ModeId;
}

export async function presentQuizGate(host: HTMLElement, options: QuizGateOptions): Promise<boolean> {
  const initialChallenge = buildQuizChallenge(options.modeId);
  let activeType: QuizType = initialChallenge.type;

  return new Promise<boolean>((resolve) => {
    const scrim = element('div', 'modal-scrim quiz-gate-scrim');
    const card = element('div', 'modal-card quiz-gate-card');
    const header = element('div', 'quiz-gate-header');
    const headerText = element('div');
    const eyebrow = element('span', 'eyebrow');
    const title = element('h2', 'section-title');
    const description = element('p', 'muted-text quiz-gate-description');
    const closeButton = element('button', 'topbar-icon-button', '홈');
    const body = element('div', 'quiz-gate-body');
    const feedback = element('div', 'quiz-gate-feedback');
    const actions = element('div', 'quiz-gate-actions');
    const retryButton = element('button', 'primary-button', '다시 풀기');
    const homeButton = element('button', 'secondary-button', '메인으로');

    let settled = false;

    const finish = (result: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      stopSpeech();
      scrim.remove();
      resolve(result);
    };

    const showRetryActions = () => {
      actions.hidden = false;
    };

    const setFeedback = (message: string, tone: 'success' | 'hint' | 'error') => {
      feedback.dataset.tone = tone;
      feedback.textContent = message;
      feedback.hidden = false;
    };

    const renderChallenge = (challenge: QuizChallenge) => {
      settled = false;
      clearNode(body);
      feedback.hidden = true;
      feedback.textContent = '';
      actions.hidden = true;
      stopSpeech();

      activeType = challenge.type;
      eyebrow.textContent = challenge.type === 'math' ? 'Warm-up Quiz' : challenge.type === 'spelling' ? 'Spelling Quiz' : 'Dictation Quiz';
      title.textContent = challenge.title;
      description.textContent = challenge.description;

      if (challenge.type === 'math') {
        renderMathChallenge(body, challenge, setFeedback, showRetryActions, () => finish(true));
        return;
      }

      if (challenge.type === 'spelling') {
        renderSpellingChallenge(body, challenge, setFeedback, showRetryActions, () => finish(true));
        return;
      }

      renderDictationChallenge(body, challenge, setFeedback, showRetryActions, () => finish(true));
    };

    headerText.append(eyebrow, title, description);
    header.append(headerText, closeButton);
    actions.append(retryButton, homeButton);
    card.append(header, body, feedback, actions);
    scrim.append(card);
    host.append(scrim);

    closeButton.addEventListener('click', () => finish(false));
    scrim.addEventListener('click', (event) => {
      if (event.target === scrim) {
        finish(false);
      }
    });

    retryButton.addEventListener('click', () => {
      renderChallenge(buildQuizChallengeForType(activeType, options.modeId));
    });

    homeButton.addEventListener('click', () => finish(false));

    renderChallenge(initialChallenge);
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
    leftGroup.append(element('span', 'quiz-fish-icon', '🏹'));
  }
  for (let index = 0; index < challenge.right; index += 1) {
    rightGroup.append(element('span', 'quiz-fish-icon', '🏹'));
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
          usedSecondChance ? '정답! 다시 생각해서 맞혔어요. 이제 경기장으로 출발할 수 있어요.' : '정답! 퀴즈 통과, 경기장 입장이 열렸어요.',
          'success',
        );
        window.setTimeout(onSuccess, 900);
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
        setFeedback('괜찮아요. 틀린 보기 하나를 지웠어요. 한 번 더 생각해 보세요.', 'hint');
        return;
      }

      buttons.forEach((item) => {
        item.disabled = true;
        if (Number(item.dataset.answer) === challenge.correctAnswer) {
          item.dataset.state = 'correct';
        }
      });
      setFeedback(`이번 문제는 아쉬웠어요. 정답은 ${challenge.correctAnswer}예요. 다시 풀면 바로 입장할 수 있어요.`, 'error');
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
  const replay = element('button', 'secondary-button quiz-replay-button', supportsSpeech() ? '다시 듣기' : '음성 없음');
  replay.toggleAttribute('disabled', !supportsSpeech());
  const count = element('span', 'topbar-pill', `총 ${challenge.choices.length}개 보기`);
  audioRow.append(replay, count);

  const promptCard = element('div', 'quiz-word-card');
  promptCard.innerHTML = `<strong>빈칸 맞춤법</strong><p>${challenge.question.promptText}</p>`;

  const choiceGrid = element('div', 'quiz-choices quiz-choice-grid');
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
      buttons.forEach((item) => {
        item.disabled = true;
        if (item.dataset.choice === challenge.question.answer) {
          item.dataset.state = 'correct';
        }
      });

      if (isCorrect) {
        setFeedback(`정답! "${challenge.question.answer}"가 맞아요. 이제 경기장으로 들어갈 수 있어요.`, 'success');
        window.setTimeout(onSuccess, 900);
        return;
      }

      button.dataset.state = 'wrong';
      setFeedback(`정답은 "${challenge.question.answer}"예요. 다시 한 문제만 더 풀어볼까요?`, 'error');
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
  const replay = element('button', 'secondary-button quiz-replay-button', supportsSpeech() ? '다시 듣기' : '단어 보기');
  const hint = element('span', 'topbar-pill', `글자 수 ${challenge.targetWord.length}`);
  audioRow.append(replay, hint);

  const promptCard = element('div', 'quiz-word-card');
  promptCard.innerHTML = supportsSpeech()
    ? '<strong>받아쓰기</strong><p>음성을 듣고 아래 칸에 그대로 적어 보세요.</p>'
    : `<strong>받아쓰기</strong><p>이 브라우저는 음성이 없어 단어를 보여드릴게요: ${challenge.targetWord}</p>`;

  const inputRow = element('div', 'quiz-input-row');
  const input = element('input', 'quiz-input') as HTMLInputElement;
  input.type = 'text';
  input.placeholder = '단어를 입력하세요';
  input.autocomplete = 'off';
  const submit = element('button', 'primary-button', '확인');
  inputRow.append(input, submit);

  const check = () => {
    if (submit.disabled) {
      return;
    }

    const value = input.value.trim();
    input.disabled = true;
    submit.disabled = true;

    if (value === challenge.targetWord) {
      input.dataset.state = 'correct';
      setFeedback('정답! 받아쓰기를 통과했어요. 이제 바로 경기할 수 있어요.', 'success');
      window.setTimeout(onSuccess, 900);
      return;
    }

    input.dataset.state = 'wrong';
    setFeedback(`아쉬워요. 정답은 "${challenge.targetWord}"예요. 다시 한 번 도전해 보세요.`, 'error');
    showRetryActions();
  };

  replay.addEventListener('click', () => {
    if (supportsSpeech()) {
      speakText(challenge.targetWord);
      return;
    }
    promptCard.innerHTML = `<strong>받아쓰기</strong><p>${challenge.targetWord}</p>`;
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

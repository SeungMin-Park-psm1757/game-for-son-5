import { DesktopAimInput } from '../input/DesktopAimInput';
import { SensorAimInput } from '../input/SensorAimInput';
import { TouchAimInput } from '../input/TouchAimInput';
import {
  applyQuickSync,
  averageSamples,
  buildCalibrationProfile,
  captureSamples,
  recommendFilterSettings,
  recommendSensitivity,
} from '../input/CalibrationService';
import type { AimInputAdapter } from '../input/types';
import type { AppSettings, CalibrationProfile, InputMode } from '../types';
import { element, type ScreenController } from './dom';

type CalibrationFlow = 'full' | 'quick';
type CalibrationStep = 'choose-input' | 'choose-hand' | 'neutral' | 'range' | 'filter' | 'test' | 'quick';

interface CalibrationScreenOptions {
  flow: CalibrationFlow;
  existingCalibration: CalibrationProfile | null;
  settings: AppSettings;
  onComplete: (profile: CalibrationProfile, settings: AppSettings) => void;
  onCancel: () => void;
}

export function createCalibrationScreen(options: CalibrationScreenOptions): ScreenController {
  const screen = element('section', 'screen calibration-screen');
  const panel = element('div', 'panel calibration-panel');
  const header = element('div', 'calibration-header');
  const eyebrow = element('div', 'eyebrow', options.flow === 'full' ? '풀 캘리브레이션' : '퀵 싱크');
  const title = element('h1', 'hero-title', options.flow === 'full' ? '자세와 조준을 맞춰볼까요?' : '짧게 중심만 다시 맞출게요');
  const subtitle = element(
    'p',
    'hero-subtitle',
    options.flow === 'full'
      ? '센서 권한, 손잡이, 중립 자세, 감도, 떨림 보정을 한 번에 저장합니다.'
      : '2~3초 안에 현재 경기용 zero offset만 다시 맞춥니다.',
  );
  header.append(eyebrow, title, subtitle);

  const preview = element('div', 'calibration-preview');
  preview.innerHTML = `<div class="preview-target"></div><div class="preview-dot"></div>`;
  const previewDot = preview.querySelector<HTMLElement>('.preview-dot')!;
  const debug = element('div', 'hud-debug');
  const content = element('div', 'calibration-content');
  const footer = element('div', 'action-row');
  const cancel = element('button', 'secondary-button', '취소');
  footer.append(cancel);
  panel.append(header, preview, debug, content, footer);
  screen.append(panel);

  let adapter: AimInputAdapter | null = null;
  let selectedMode: InputMode | null = options.existingCalibration?.inputMode ?? null;
  let selectedHand = options.existingCalibration?.dominantHand ?? options.settings.dominantHand;
  let step: CalibrationStep = options.flow === 'quick' ? 'quick' : 'choose-input';
  let neutralSamples = options.existingCalibration ? [toSample(options.existingCalibration.neutral)] : [];
  let rangeSamples = neutralSamples;
  let jitterSamples = neutralSamples;
  let animationFrame = 0;

  const selectMode = async (mode: InputMode) => {
    const nextAdapter = createAdapter(mode);
    if (mode === 'sensor' && nextAdapter.requestPermission) {
      const permission = await nextAdapter.requestPermission();
      if (permission !== 'granted') {
        renderMessage('센서 권한을 얻지 못해 터치 조준으로 전환합니다.');
        await selectMode('touch');
        return;
      }
    }

    adapter?.stop();
    adapter = nextAdapter;
    adapter.setCalibration(options.existingCalibration);
    adapter.start();
    adapter.attachSurface(preview);
    selectedMode = mode;
    if (options.flow === 'full' && step === 'choose-input') {
      step = 'choose-hand';
    } else if (options.flow === 'quick') {
      step = 'quick';
    }
    renderStep();
  };

  const renderMessage = (message: string) => {
    const banner = element('div', 'inline-banner', message);
    content.prepend(banner);
  };

  const updatePreview = () => {
    if (adapter) {
      const snapshot = adapter.getSnapshot();
      previewDot.style.transform = `translate(${snapshot.yaw * 110}px, ${snapshot.pitch * -90}px)`;
      debug.hidden = !options.settings.debugOverlay;
      debug.innerHTML = `
        <strong>debug</strong>
        <span>raw ${snapshot.rawYaw.toFixed(2)} / ${snapshot.rawPitch.toFixed(2)}</span>
        <span>smooth ${snapshot.smoothedYaw.toFixed(2)} / ${snapshot.smoothedPitch.toFixed(2)}</span>
        <span>aim ${snapshot.yaw.toFixed(2)} / ${snapshot.pitch.toFixed(2)}</span>
      `;
    }
    animationFrame = window.requestAnimationFrame(updatePreview);
  };

  const renderStep = () => {
    content.innerHTML = '';
    if (!selectedMode && options.flow === 'full') {
      step = 'choose-input';
    }

    if (step === 'choose-input') {
      const body = element('div', 'calibration-step');
      body.innerHTML = `<h2 class="section-title">입력 방식 선택</h2><p>센서가 가능하면 먼저 시도하고, 안 되면 바로 터치로 이어집니다.</p>`;
      const actions = element('div', 'stacked-actions');
      const sensor = element('button', 'primary-button', '센서 권한 요청');
      const touch = element('button', 'secondary-button', '터치 조준 사용');
      const desktop = element('button', 'secondary-button', '데스크톱 조준 사용');
      sensor.addEventListener('click', () => void selectMode('sensor'));
      touch.addEventListener('click', () => void selectMode('touch'));
      desktop.addEventListener('click', () => void selectMode('desktop'));
      actions.append(sensor, touch, desktop);
      body.append(actions);
      content.append(body);
      return;
    }

    if (step === 'choose-hand') {
      const body = element('div', 'calibration-step');
      body.innerHTML = `<h2 class="section-title">손잡이 선택</h2><p>왼손잡이와 오른손잡이에 따라 yaw 반전을 저장합니다.</p>`;
      const actions = element('div', 'action-row');
      const left = element('button', 'secondary-button', '왼손잡이');
      const right = element('button', 'primary-button', '오른손잡이');
      left.addEventListener('click', () => {
        selectedHand = 'left';
        step = 'neutral';
        renderStep();
      });
      right.addEventListener('click', () => {
        selectedHand = 'right';
        step = 'neutral';
        renderStep();
      });
      actions.append(left, right);
      body.append(actions);
      content.append(body);
      return;
    }

    if (step === 'neutral') {
      content.append(
        createCaptureStep(
          '중립 자세 저장',
          '휴대폰을 활 쏘는 기본 자세로 들고 1초 동안 유지해 주세요.',
          '중립 자세 기록',
          1200,
          async (samples) => {
            neutralSamples = samples;
            step = 'range';
            renderStep();
          },
        ),
      );
      return;
    }

    if (step === 'range') {
      content.append(
        createCaptureStep(
          '감도 범위 측정',
          '좌우와 상하를 천천히 움직이며 2.5초 동안 범위를 측정합니다.',
          '감도 측정 시작',
          2500,
          async (samples) => {
            rangeSamples = samples;
            step = 'filter';
            renderStep();
          },
        ),
      );
      return;
    }

    if (step === 'filter') {
      content.append(
        createCaptureStep(
          '떨림 보정 측정',
          '이번에는 가능한 한 가만히 들고 있어 주세요. EMA와 deadzone 추천값을 계산합니다.',
          '떨림 측정 시작',
          1600,
          async (samples) => {
            jitterSamples = samples;
            step = 'test';
            renderStep();
          },
        ),
      );
      return;
    }

    if (step === 'test') {
      const neutral = averageSamples(neutralSamples);
      const recommendation = recommendFilterSettings(jitterSamples);
      const sensitivity = recommendSensitivity({
        yawRange: Math.max(...rangeSamples.map((sample) => Math.abs(sample.yaw - neutral.yaw)), 1),
        pitchRange: Math.max(...rangeSamples.map((sample) => Math.abs(sample.pitch - neutral.pitch)), 1),
      });
      const profile = buildCalibrationProfile(selectedMode!, selectedHand, neutral, rangeSamples, jitterSamples);
      const summary = element('div', 'calibration-step');
      summary.innerHTML = `
        <h2 class="section-title">테스트 샷 준비 완료</h2>
        <p>추천 감도 yaw ${sensitivity.yaw.toFixed(2)} / pitch ${sensitivity.pitch.toFixed(2)}</p>
        <p>deadzone ${recommendation.deadzone.toFixed(3)} / smoothing ${recommendation.smoothingAlpha.toFixed(2)}</p>
      `;
      const save = element('button', 'primary-button', '저장하고 경기로');
      save.addEventListener('click', () => {
        options.onComplete(profile, { ...options.settings, dominantHand: selectedHand });
      });
      summary.append(save);
      content.append(summary);
      return;
    }

    if (step === 'quick') {
      const quick = element('div', 'calibration-step');
      quick.innerHTML = `
        <h2 class="section-title">과녁 중앙에 맞춘 채 1초 유지</h2>
        <p>현재 경기용 중심점만 빠르게 다시 맞춥니다.</p>
      `;
      const start = element('button', 'primary-button', '퀵 싱크 시작');
      start.addEventListener('click', async () => {
        if (!selectedMode) {
          const preferred = options.existingCalibration?.inputMode ?? guessInputMode(options.settings.preferredInput);
          await selectMode(preferred);
          return;
        }
        const center = averageSamples(await captureSamples(adapter!, 1200));
        const profile = options.existingCalibration
          ? applyQuickSync({ ...options.existingCalibration, inputMode: selectedMode }, center)
          : buildCalibrationProfile(selectedMode, selectedHand, center, [center], [center]);
        options.onComplete(profile, { ...options.settings, dominantHand: selectedHand });
      });
      quick.append(start);
      content.append(quick);
      return;
    }
  };

  cancel.addEventListener('click', options.onCancel);

  if (options.flow === 'quick') {
    void selectMode(options.existingCalibration?.inputMode ?? guessInputMode(options.settings.preferredInput));
  } else if (selectedMode) {
    void selectMode(selectedMode).then(() => {
      step = 'choose-hand';
      renderStep();
    });
  }

  if (options.flow === 'full' && !selectedMode) {
    renderStep();
  }

  if (options.flow === 'quick' && selectedMode) {
    renderStep();
  }

  animationFrame = window.requestAnimationFrame(updatePreview);

  return {
    element: screen,
    destroy: () => {
      window.cancelAnimationFrame(animationFrame);
      adapter?.stop();
    },
  };

  function createCaptureStep(
    titleText: string,
    description: string,
    buttonText: string,
    durationMs: number,
    onRun: (samples: Awaited<ReturnType<typeof captureSamples>>) => Promise<void>,
  ) {
    const body = element('div', 'calibration-step');
    const titleNode = element('h2', 'section-title', titleText);
    const desc = element('p', '', description);
    const progress = element('div', 'progress-bar');
    const fill = element('div', 'progress-fill');
    progress.append(fill);
    const action = element('button', 'primary-button', buttonText);
    action.addEventListener('click', async () => {
      action.disabled = true;
      const samples = await captureSamples(adapter!, durationMs, (ratio) => {
        fill.style.transform = `scaleX(${ratio})`;
      });
      await onRun(samples);
    });
    body.append(titleNode, desc, progress, action);
    return body;
  }
}

function createAdapter(mode: InputMode): AimInputAdapter {
  if (mode === 'sensor') {
    return new SensorAimInput();
  }
  if (mode === 'desktop') {
    return new DesktopAimInput();
  }
  return new TouchAimInput();
}

function guessInputMode(preferredInput: AppSettings['preferredInput']): InputMode {
  if (preferredInput !== 'auto') {
    return preferredInput;
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches) {
    return 'desktop';
  }
  return 'touch';
}

function toSample(source: { yaw: number; pitch: number }) {
  return { yaw: source.yaw, pitch: source.pitch, timestamp: Date.now() };
}

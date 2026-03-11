import type { AimSnapshot } from '../input/types';
import type { InputMode } from '../types';
import { element } from './dom';

export interface MatchHudState {
  arrowIndex: number;
  arrowCount: number;
  totalScore: number;
  xCount: number;
  windLabel: string;
  inputMode: InputMode;
  paused: boolean;
  debugEnabled: boolean;
  snapshot: AimSnapshot;
  tension: number;
  releaseTiming: number;
}

interface MatchHudOptions {
  onDrawStart: () => void;
  onDrawRelease: () => void;
  onPauseToggle: () => void;
  onRecenter: () => void;
  onQuit: () => void;
}

export class MatchHUD {
  public readonly element: HTMLElement;
  private readonly summary = element('div', 'hud-summary');
  private readonly debug = element('div', 'hud-debug');
  private readonly drawButton = element('button', 'draw-button', '당겨서 쏘기');
  private readonly pauseButton = element('button', 'secondary-button', '일시정지');
  private readonly coachCard = element('div', 'hud-coach-card');

  constructor(options: MatchHudOptions) {
    const root = element('div', 'match-hud');
    const topBar = element('div', 'hud-topbar');
    const recenterButton = element('button', 'secondary-button', '중앙 복귀');
    const quitButton = element('button', 'secondary-button', '홈');
    topBar.append(this.summary, recenterButton, this.pauseButton, quitButton);

    const bottomBar = element('div', 'hud-bottombar');
    bottomBar.append(this.coachCard, this.debug, this.drawButton);
    root.append(topBar, bottomBar);
    this.element = root;

    this.drawButton.addEventListener('pointerdown', () => options.onDrawStart());
    this.drawButton.addEventListener('pointerup', () => options.onDrawRelease());
    this.drawButton.addEventListener('pointerleave', () => options.onDrawRelease());
    this.drawButton.addEventListener('pointercancel', () => options.onDrawRelease());
    this.pauseButton.addEventListener('click', options.onPauseToggle);
    recenterButton.addEventListener('click', options.onRecenter);
    quitButton.addEventListener('click', options.onQuit);
  }

  public update(state: MatchHudState): void {
    this.summary.innerHTML = `
      <span class="hud-chip">화살 ${Math.min(state.arrowIndex + 1, state.arrowCount)} / ${state.arrowCount}</span>
      <span class="hud-chip">총점 ${state.totalScore}</span>
      <span class="hud-chip">X ${state.xCount}</span>
      <span class="hud-chip">바람 ${state.windLabel}</span>
      <span class="hud-chip">${getInputLabel(state.inputMode)}</span>
    `;

    const tensionLabel = getTensionLabel(state.tension);
    const timingLabel = getTimingLabel(state.releaseTiming);
    this.coachCard.innerHTML = `
      <span class="coach-label">릴리스 타이밍</span>
      <strong>${timingLabel}</strong>
      <small>긴장도 ${tensionLabel}</small>
      <div class="timing-meter">
        <span class="timing-fill" style="transform: scaleX(${state.releaseTiming.toFixed(3)})"></span>
      </div>
      <p>떨림이 잦아드는 순간에 버튼을 놓아보세요.</p>
    `;

    this.pauseButton.textContent = state.paused ? '계속' : '일시정지';
    this.drawButton.textContent = state.paused ? '일시정지 중' : '당겨서 쏘기';
    this.drawButton.disabled = state.paused;
    this.debug.hidden = !state.debugEnabled;
    this.debug.innerHTML = `
      <strong>debug</strong>
      <span>raw ${state.snapshot.rawYaw.toFixed(2)} / ${state.snapshot.rawPitch.toFixed(2)}</span>
      <span>smooth ${state.snapshot.smoothedYaw.toFixed(2)} / ${state.snapshot.smoothedPitch.toFixed(2)}</span>
      <span>aim ${state.snapshot.yaw.toFixed(2)} / ${state.snapshot.pitch.toFixed(2)} · stability ${(state.snapshot.stability * 100).toFixed(0)}%</span>
    `;
  }
}

function getInputLabel(mode: InputMode): string {
  if (mode === 'desktop') {
    return '마우스 조준';
  }
  if (mode === 'sensor') {
    return '센서 조준';
  }
  return '터치 조준';
}

function getTimingLabel(timing: number): string {
  if (timing >= 0.8) {
    return '지금 놓기 좋아요';
  }
  if (timing >= 0.55) {
    return '곧 기회가 옵니다';
  }
  if (timing >= 0.3) {
    return '조금만 더 참아보세요';
  }
  return '아직 흔들림이 큽니다';
}

function getTensionLabel(tension: number): string {
  if (tension >= 0.92) {
    return '높음';
  }
  if (tension >= 0.55) {
    return '집중 중';
  }
  return '안정적';
}

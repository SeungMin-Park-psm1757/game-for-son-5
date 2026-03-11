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
  private readonly drawButton = element('button', 'draw-button', '시위 당기기');
  private readonly pauseButton = element('button', 'secondary-button', '일시정지');

  constructor(options: MatchHudOptions) {
    const root = element('div', 'match-hud');
    const topBar = element('div', 'hud-topbar');
    const recenterButton = element('button', 'secondary-button', '재중앙');
    const quitButton = element('button', 'secondary-button', '홈');
    topBar.append(this.summary, recenterButton, this.pauseButton, quitButton);

    const bottomBar = element('div', 'hud-bottombar');
    bottomBar.append(this.debug, this.drawButton);
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
      <span class="hud-chip">점수 ${state.totalScore}</span>
      <span class="hud-chip">X ${state.xCount}</span>
      <span class="hud-chip">바람 ${state.windLabel}</span>
      <span class="hud-chip">${state.inputMode}</span>
    `;

    this.pauseButton.textContent = state.paused ? '재개' : '일시정지';
    this.drawButton.textContent = state.paused ? '일시정지 중' : '시위 당기기';
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

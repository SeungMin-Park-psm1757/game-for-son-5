import type { AimSnapshot } from '../input/types';
import { element } from './dom';

export interface MatchHudState {
  arrowIndex: number;
  arrowCount: number;
  totalScore: number;
  xCount: number;
  windLabel: string;
  paused: boolean;
  debugEnabled: boolean;
  snapshot: AimSnapshot;
  tension: number;
  releaseTiming: number;
  drawing: boolean;
}

interface MatchHudOptions {
  onPauseToggle: () => void;
  onRecenter: () => void;
  onQuit: () => void;
}

export class MatchHUD {
  public readonly element: HTMLElement;
  private readonly summary = element('div', 'hud-summary');
  private readonly debug = element('div', 'hud-debug');
  private readonly pauseButton = element('button', 'secondary-button hud-action-button', '일시정지');
  private readonly coachCard = element('div', 'hud-coach-card');
  private readonly controlHint = element('div', 'hud-control-hint');
  private readonly scope = this.createScopeReticle();
  private readonly scopeDot: HTMLElement;

  constructor(options: MatchHudOptions) {
    const root = element('div', 'match-hud');
    const topBar = element('div', 'hud-topbar');
    const actionBar = element('div', 'hud-actions');
    const recenterButton = element('button', 'secondary-button hud-action-button', '중앙 복귀');
    const quitButton = element('button', 'secondary-button hud-action-button', '홈');

    actionBar.append(recenterButton, this.pauseButton, quitButton);
    topBar.append(this.summary, actionBar);

    const bottomBar = element('div', 'hud-bottombar');
    bottomBar.append(this.coachCard, this.controlHint, this.debug);
    root.append(this.scope, topBar, bottomBar);
    this.element = root;

    this.scopeDot = this.scope.querySelector('.scope-dot') as HTMLElement;

    this.pauseButton.addEventListener('click', options.onPauseToggle);
    recenterButton.addEventListener('click', options.onRecenter);
    quitButton.addEventListener('click', options.onQuit);
  }

  public update(state: MatchHudState): void {
    this.summary.innerHTML = [
      renderStatCard('화살', `${Math.min(state.arrowIndex + 1, state.arrowCount)} / ${state.arrowCount}`),
      renderStatCard('점수', `${state.totalScore}`, 'is-score'),
      renderStatCard('X', `${state.xCount}`, 'is-x'),
      renderStatCard('바람', state.windLabel, 'is-wind'),
    ].join('');

    const tensionLabel = getTensionLabel(state.tension);
    const timingLabel = getTimingLabel(state.releaseTiming);

    this.coachCard.innerHTML = `
      <span class="coach-label">릴리스 타이밍</span>
      <strong>${timingLabel}</strong>
      <small>지금 팔의 긴장도는 ${tensionLabel}</small>
      <div class="timing-meter">
        <span class="timing-fill" style="transform: scaleX(${state.releaseTiming.toFixed(3)})"></span>
      </div>
      <p>${state.drawing ? '조준점이 잠잠해질 때 손을 떼면 화살이 더 곧게 들어갑니다.' : '과녁 화면을 길게 누른 채 움직여 조준하고, 손을 떼는 순간 발사하세요.'}</p>
    `;

    this.controlHint.innerHTML = `
      <span class="coach-label">${state.drawing ? '조준 중' : '조작 안내'}</span>
      <strong>${state.drawing ? '누른 채로 움직이면 미세 조준' : '길게 누르고 끌어서 과녁 맞추기'}</strong>
      <p>${state.drawing ? '지금은 자동 발사되지 않습니다. 오래 잡고 있어도 계속 조준만 유지됩니다.' : '확대 조준은 누른 뒤 잠깐 유지하면 열리고, 놓는 순간 바로 발사됩니다.'}</p>
    `;

    this.pauseButton.textContent = state.paused ? '계속' : '일시정지';
    this.debug.hidden = !state.debugEnabled;
    this.debug.innerHTML = `
      <strong>debug</strong>
      <span>raw ${state.snapshot.rawYaw.toFixed(2)} / ${state.snapshot.rawPitch.toFixed(2)}</span>
      <span>smooth ${state.snapshot.smoothedYaw.toFixed(2)} / ${state.snapshot.smoothedPitch.toFixed(2)}</span>
      <span>aim ${state.snapshot.yaw.toFixed(2)} / ${state.snapshot.pitch.toFixed(2)} | stability ${(state.snapshot.stability * 100).toFixed(0)}%</span>
    `;

    const scopeX = clamp(state.snapshot.yaw * 32, -34, 34);
    const scopeY = clamp(state.snapshot.pitch * -24, -26, 26);
    this.scopeDot.style.transform = `translate(${scopeX}px, ${scopeY}px)`;
    this.scope.dataset.active = state.drawing ? 'true' : 'false';
  }

  private createScopeReticle(): HTMLElement {
    const scope = element('div', 'scope-reticle');
    scope.innerHTML = `
      <div class="scope-ring scope-ring-outer"></div>
      <div class="scope-ring scope-ring-mid"></div>
      <div class="scope-ring scope-ring-inner"></div>
      <span class="scope-line scope-line-h"></span>
      <span class="scope-line scope-line-v"></span>
      <span class="scope-dot"></span>
    `;
    scope.dataset.active = 'false';
    return scope;
  }
}

function renderStatCard(label: string, value: string, modifier = ''): string {
  const className = modifier ? `hud-stat-card ${modifier}` : 'hud-stat-card';
  return `
    <div class="${className}">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function getTimingLabel(timing: number): string {
  if (timing >= 0.8) {
    return '지금 놓기 좋아요';
  }
  if (timing >= 0.55) {
    return '곧 좋은 순간이 옵니다';
  }
  if (timing >= 0.3) {
    return '조금만 더 기다려 보세요';
  }
  return '아직 떨림이 큽니다';
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

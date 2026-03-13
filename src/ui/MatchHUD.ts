import type { AimSnapshot } from '../input/types';
import { element } from './dom';

export interface MatchImpactBriefing {
  tone: 'miss' | 'normal' | 'ten' | 'x' | 'overlap';
  icon: string;
  tag: string;
  headline: string;
  detail: string;
  scoreText: string;
  isHighlight: boolean;
  specialLabel?: string;
}

export interface MatchHudState {
  modeLabel: string;
  arrowIndex: number;
  arrowCount: number;
  totalScore: number;
  rivalName: string | null;
  rivalScore: number;
  xCount: number;
  windLabel: string;
  levelLabel: string;
  paused: boolean;
  debugEnabled: boolean;
  snapshot: AimSnapshot;
  tension: number;
  releaseTiming: number;
  drawing: boolean;
  turnLabel: string;
  impactBriefing: MatchImpactBriefing | null;
}

interface MatchHudOptions {
  onPauseToggle: () => void;
  onRecenter: () => void;
  onQuit: () => void;
}

export class MatchHUD {
  public readonly element: HTMLElement;
  private readonly ribbon = element('div', 'hud-ribbon');
  private readonly debug = element('div', 'hud-debug');
  private readonly pauseButton = element('button', 'secondary-button hud-icon-button', '⏸');
  private readonly coachCard = element('div', 'hud-coach-card');
  private readonly impactFlash = element('div', 'hit-briefing');
  private readonly scope = this.createScopeReticle();
  private readonly scopeDot: HTMLElement;

  constructor(options: MatchHudOptions) {
    const root = element('div', 'match-hud');
    const actionBar = element('div', 'hud-icon-actions');
    const recenterButton = element('button', 'secondary-button hud-icon-button', '🧭');
    const quitButton = element('button', 'secondary-button hud-icon-button', '🏠');
    recenterButton.title = '중앙 복귀';
    this.pauseButton.title = '일시정지';
    quitButton.title = '홈';
    actionBar.append(recenterButton, this.pauseButton, quitButton);

    const topBar = element('div', 'hud-topbar');
    topBar.append(this.ribbon, actionBar);

    const bottomBar = element('div', 'hud-bottombar');
    bottomBar.append(this.coachCard, this.debug);
    root.append(this.scope, topBar, this.impactFlash, bottomBar);
    this.element = root;

    this.scopeDot = this.scope.querySelector('.scope-dot') as HTMLElement;
    this.impactFlash.hidden = true;

    this.pauseButton.addEventListener('click', options.onPauseToggle);
    recenterButton.addEventListener('click', options.onRecenter);
    quitButton.addEventListener('click', options.onQuit);
  }

  public update(state: MatchHudState): void {
    this.ribbon.innerHTML = `
      <span>${state.modeLabel}</span>
      <span>🎯 ${Math.min(state.arrowIndex + 1, state.arrowCount)}/${state.arrowCount}</span>
      <span>🏹 ${state.totalScore}점</span>
      <span>✨ X ${state.xCount}</span>
      <span>🏅 ${state.levelLabel}</span>
    `;

    const tensionLabel = getTensionLabel(state.tension);
    const timingLabel = getTimingLabel(state.releaseTiming);
    const modeHint = state.drawing ? '누른 채 유지하고 좋은 순간에 놓으세요' : '길게 눌러 스코프 확대 후 놓으세요';
    const scoreLine = state.rivalName ? `${state.rivalName} ${state.rivalScore}점 · 정우 ${state.totalScore}점` : `정우 ${state.totalScore}점`;
    this.coachCard.innerHTML = `
      <div class="coach-meta-row">
        <span class="coach-label">릴리스 타이밍</span>
        <span class="coach-wind">${state.turnLabel}</span>
      </div>
      <strong>${timingLabel}</strong>
      <small>${scoreLine}</small>
      <small>긴장도 ${tensionLabel} · 바람 ${state.windLabel} · ${modeHint}</small>
      <div class="timing-meter">
        <span class="timing-fill" style="transform: scaleX(${state.releaseTiming.toFixed(3)})"></span>
      </div>
    `;

    this.pauseButton.textContent = state.paused ? '▶' : '⏸';
    this.element.dataset.drawing = state.drawing ? 'true' : 'false';
    this.element.dataset.impact = state.impactBriefing ? 'true' : 'false';
    this.debug.hidden = !state.debugEnabled;
    this.debug.innerHTML = `
      <strong>debug</strong>
      <span>raw ${state.snapshot.rawYaw.toFixed(2)} / ${state.snapshot.rawPitch.toFixed(2)}</span>
      <span>smooth ${state.snapshot.smoothedYaw.toFixed(2)} / ${state.snapshot.smoothedPitch.toFixed(2)}</span>
      <span>aim ${state.snapshot.yaw.toFixed(2)} / ${state.snapshot.pitch.toFixed(2)} | stability ${(state.snapshot.stability * 100).toFixed(0)}%</span>
    `;

    if (state.impactBriefing) {
      this.impactFlash.hidden = false;
      this.impactFlash.dataset.tone = state.impactBriefing.tone;
      this.impactFlash.dataset.highlight = state.impactBriefing.isHighlight ? 'true' : 'false';
      this.impactFlash.innerHTML = `
        <span>${state.impactBriefing.icon} ${state.impactBriefing.tag}</span>
        <strong>${state.impactBriefing.headline}</strong>
        <p>${state.impactBriefing.scoreText} · ${state.impactBriefing.detail}</p>
        ${state.impactBriefing.specialLabel ? `<small>${state.impactBriefing.specialLabel}</small>` : ''}
      `;
    } else {
      this.impactFlash.hidden = true;
    }

    const scopeX = clamp(state.snapshot.yaw * 34, -40, 40);
    const scopeY = clamp(state.snapshot.pitch * -26, -30, 30);
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

function getTimingLabel(timing: number): string {
  if (timing >= 0.8) {
    return '지금 놓기 좋아요';
  }
  if (timing >= 0.55) {
    return '곧 좋은 순간이 옵니다';
  }
  if (timing >= 0.3) {
    return '한 박자 더 기다려보세요';
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

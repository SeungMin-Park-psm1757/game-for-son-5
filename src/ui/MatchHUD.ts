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

export interface MatchScoreFlash {
  owner: 'player' | 'rival';
  label: string;
  scoreText: string;
  totalsText: string;
  tone: 'miss' | 'normal' | 'high' | 'perfect';
  isShowy: boolean;
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
  scoreFlash: MatchScoreFlash | null;
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
  private readonly pauseButton = element('button', 'secondary-button hud-icon-button', 'II');
  private readonly coachCard = element('div', 'hud-coach-card');
  private readonly impactFlash = element('div', 'hit-briefing');
  private readonly scoreFlash = element('div', 'score-flash');
  private readonly scope = this.createScopeReticle();
  private readonly scopeDot: HTMLElement;

  constructor(options: MatchHudOptions) {
    const root = element('div', 'match-hud');
    const actionBar = element('div', 'hud-icon-actions');
    const recenterButton = element('button', 'secondary-button hud-icon-button', 'R');
    const quitButton = element('button', 'secondary-button hud-icon-button', 'X');
    recenterButton.title = '\uc911\uc559 \ubcf5\uadc0';
    this.pauseButton.title = '\uc77c\uc2dc\uc815\uc9c0';
    quitButton.title = '\ub098\uac00\uae30';
    actionBar.append(recenterButton, this.pauseButton, quitButton);

    const topBar = element('div', 'hud-topbar');
    topBar.append(this.ribbon, actionBar);

    const bottomBar = element('div', 'hud-bottombar');
    bottomBar.append(this.coachCard, this.debug);
    root.append(this.scope, topBar, this.impactFlash, this.scoreFlash, bottomBar);
    this.element = root;

    this.scopeDot = this.scope.querySelector('.scope-dot') as HTMLElement;
    this.impactFlash.hidden = true;
    this.scoreFlash.hidden = true;

    this.pauseButton.addEventListener('click', options.onPauseToggle);
    recenterButton.addEventListener('click', options.onRecenter);
    quitButton.addEventListener('click', options.onQuit);
  }

  public update(state: MatchHudState): void {
    this.ribbon.innerHTML = `
      <span>${state.modeLabel}</span>
      <span>\ud654\uc0b4 ${Math.min(state.arrowIndex + 1, state.arrowCount)}/${state.arrowCount}</span>
      <span>\ucd1d\uc810 ${state.totalScore}</span>
      <span>X ${state.xCount}</span>
      <span>${state.levelLabel}</span>
    `;

    const tensionLabel = getTensionLabel(state.tension);
    const timingLabel = getTimingLabel(state.releaseTiming);
    const modeHint = state.drawing
      ? '\ud65c\uc2dc\uc704\ub97c \uace0\uc815\ud558\uace0 \uc88b\uc740 \ud0c0\uc774\ubc0d\uc744 \ub9de\ucdb0\ubd10\uc694.'
      : '\uae38\uac8c \ub20c\ub7ec \uc26c\uac70\ub098 Space\ub97c \ub204\ub974\uba74 \uc2dc\uc704\ub97c \ub2f9\uae38 \uc218 \uc788\uc5b4\uc694.';
    const scoreLine = state.rivalName
      ? `\ub0b4 \uc810\uc218 ${state.totalScore} · ${state.rivalName} ${state.rivalScore}`
      : `\ucd1d\uc810 ${state.totalScore}`;

    this.coachCard.innerHTML = `
      <div class="coach-meta-row">
        <span class="coach-label">\ud134 \uc548\ub0b4</span>
        <span class="coach-wind">${state.turnLabel}</span>
      </div>
      <strong>${timingLabel}</strong>
      <small>${scoreLine}</small>
      <small>\uae34\uc7a5\uac10 ${tensionLabel} · \ubc14\ub78c ${state.windLabel} · ${modeHint}</small>
      <div class="timing-meter">
        <span class="timing-fill" style="transform: scaleX(${state.releaseTiming.toFixed(3)})"></span>
      </div>
    `;

    this.pauseButton.textContent = state.paused ? '>' : 'II';
    this.element.dataset.drawing = state.drawing ? 'true' : 'false';
    this.element.dataset.impact = state.impactBriefing ? 'true' : 'false';
    this.element.dataset.scoreFlash = state.scoreFlash ? 'true' : 'false';
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

    if (state.scoreFlash) {
      this.scoreFlash.hidden = false;
      this.scoreFlash.dataset.owner = state.scoreFlash.owner;
      this.scoreFlash.dataset.tone = state.scoreFlash.tone;
      this.scoreFlash.dataset.showy = state.scoreFlash.isShowy ? 'true' : 'false';
      this.scoreFlash.innerHTML = `
        <span class="score-flash-label">${state.scoreFlash.label}</span>
        <strong>${state.scoreFlash.scoreText}</strong>
        <small>${state.scoreFlash.totalsText}</small>
      `;
    } else {
      this.scoreFlash.hidden = true;
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
    return '\uc9c0\uae08 \ubc14\ub85c \ub193\uc73c\uba74 \uc88b\uc544\uc694.';
  }
  if (timing >= 0.55) {
    return '\uac70\uc758 \uc88b\uc740 \ud0c0\uc774\ubc0d\uc774\uc5d0\uc694.';
  }
  if (timing >= 0.3) {
    return '\ud55c \ubc15\uc790\ub9cc \ub354 \uae30\ub2e4\ub824 \ubcf4\uc138\uc694.';
  }
  return '\uc544\uc9c1 \uc27c \ud0c0\uc774\ubc0d\uc774 \uc798 \ub9de\uc544\uc694.';
}

function getTensionLabel(tension: number): string {
  if (tension >= 0.92) {
    return '\ub192\uc74c';
  }
  if (tension >= 0.55) {
    return '\uc9d1\uc911 \uc911';
  }
  return '\uc548\uc815\uc801';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

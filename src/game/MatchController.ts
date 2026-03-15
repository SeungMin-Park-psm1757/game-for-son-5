import { getModeConfig, getResultBand, getUnlockedNextMode } from '../data/modes';
import { getScoreRank, isPersonalBest } from '../data/records';
import { createRivalShot, getRivalProfile } from '../data/rival';
import { DesktopAimInput } from '../input/DesktopAimInput';
import { TouchAimInput } from '../input/TouchAimInput';
import type { AimInputAdapter, AimSnapshot } from '../input/types';
import { AudioService } from '../services/AudioService';
import { HapticsService } from '../services/HapticsService';
import type { StoryTrigger } from '../story/types';
import type { AppSettings, CalibrationProfile, MatchRecord, ModeId, RivalId } from '../types';
import { element, type ScreenController } from '../ui/dom';
import { MatchHUD, type MatchImpactBriefing, type MatchScoreFlash } from '../ui/MatchHUD';
import { simulateArrowFlight } from './Ballistics';
import { ArcheryScene } from './ArcheryScene';
import { getPlayerProgress } from './playerProgress';
import { scoreTarget, TARGET_RADIUS } from './Scoring';
import type { MatchSummary } from './types';
import { WindSystem } from './WindSystem';

interface MatchControllerOptions {
  modeId: ModeId;
  rivalId: RivalId | null;
  calibration: CalibrationProfile | null;
  settings: AppSettings;
  records: MatchRecord[];
  audio: AudioService;
  haptics: HapticsService;
  onQuit: () => void;
  onStoryTrigger: (trigger: StoryTrigger) => Promise<void>;
  onComplete: (summary: MatchSummary) => void;
}

interface AimFrameState {
  snapshot: AimSnapshot;
  drawDuration: number;
  tension: number;
  releaseTiming: number;
  effectiveStability: number;
}

export class MatchController implements ScreenController {
  public readonly element: HTMLElement;
  private readonly mode;
  private readonly sceneHost = element('div', 'match-scene');
  private readonly pauseOverlay = element('div', 'pause-overlay');
  private readonly hud: MatchHUD;
  private readonly scene: ArcheryScene;
  private readonly windSystem: WindSystem;
  private adapter: AimInputAdapter | null = null;
  private frameHandle = 0;
  private drawStartedAt = 0;
  private activeDrawPointerId: number | null = null;
  private drawing = false;
  private animating = false;
  private paused = false;
  private destroyed = false;
  private arrowIndex = 0;
  private totalScore = 0;
  private xCount = 0;
  private currentWind = 0;
  private readonly arrowScores: number[] = [];
  private readonly rivalArrowScores: number[] = [];
  private readonly stabilitySamples: number[] = [];
  private readonly releaseSamples: number[] = [];
  private readonly hitHistory: Array<{ x: number; y: number }> = [];
  private drawStabilityWindow: number[] = [];
  private lowScoreStreak = 0;
  private seenTen = false;
  private seenBullseye = false;
  private readonly startedAt = Date.now();
  private arrowPatternSeed = Math.random() * Math.PI * 2;
  private impactBriefing: MatchImpactBriefing | null = null;
  private impactBriefingUntil = 0;
  private scoreFlash: MatchScoreFlash | null = null;
  private scoreFlashUntil = 0;
  private progress = getPlayerProgress([]);
  private readonly rival;
  private rivalTotalScore = 0;
  private rivalTurn = false;

  constructor(private readonly options: MatchControllerOptions) {
    this.mode = getModeConfig(this.options.modeId);
    this.rival = getRivalProfile(this.options.modeId, this.options.rivalId);
    this.windSystem = new WindSystem(this.mode.windDrift, this.mode.windClamp);
    this.currentWind = this.windSystem.next(0);
    this.progress = getPlayerProgress(this.options.records);

    const root = element('section', 'screen match-screen');
    const surface = element('div', 'match-surface');
    this.hud = new MatchHUD({
      onPauseToggle: () => this.togglePause(),
      onRecenter: () => this.recenter(),
      onQuit: options.onQuit,
    });

    this.pauseOverlay.innerHTML = `
      <div class="panel pause-card">
        <h2 class="section-title">\uc77c\uc2dc \uc815\uc9c0</h2>
        <p class="muted-text">\uacc4\uc18d \ubc84\ud2bc\uc744 \ub204\ub974\uba74 \ubc14\ub85c \uacbd\uae30\ub85c \ub3cc\uc544\uac11\ub2c8\ub2e4.</p>
      </div>
    `;
    this.pauseOverlay.hidden = true;
    surface.append(this.sceneHost, this.hud.element, this.pauseOverlay);
    root.append(surface);
    this.element = root;
    this.scene = new ArcheryScene(this.sceneHost, options.settings.reduceMotion, this.mode.chapterId, this.progress.arrowTheme);

    this.sceneHost.addEventListener('pointerdown', this.onSurfacePointerDown);
    this.sceneHost.addEventListener('pointerup', this.onSurfacePointerUp);
    this.sceneHost.addEventListener('pointercancel', this.onSurfacePointerCancel);
    window.addEventListener('pointerup', this.onWindowPointerUp);
    window.addEventListener('pointercancel', this.onWindowPointerCancel);
    window.addEventListener('keydown', this.onKeyDown);

    void this.initializeAdapter();
    this.loop();
    if (this.rival) {
      this.animating = true;
      void this.runRivalTurn();
    }
  }

  public destroy(): void {
    this.destroyed = true;
    window.cancelAnimationFrame(this.frameHandle);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('pointerup', this.onWindowPointerUp);
    window.removeEventListener('pointercancel', this.onWindowPointerCancel);
    this.sceneHost.removeEventListener('pointerdown', this.onSurfacePointerDown);
    this.sceneHost.removeEventListener('pointerup', this.onSurfacePointerUp);
    this.sceneHost.removeEventListener('pointercancel', this.onSurfacePointerCancel);
    this.adapter?.stop();
    this.scene.destroy();
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.code === 'Space') {
      event.preventDefault();
      if (this.drawing) {
        void this.releaseDraw();
      } else {
        this.beginDraw();
      }
    } else if (event.key.toLowerCase() === 'r') {
      this.recenter();
    }
  };

  private readonly onSurfacePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || this.activeDrawPointerId !== null) {
      return;
    }

    event.preventDefault();
    this.activeDrawPointerId = event.pointerId;
    safeSetPointerCapture(this.sceneHost, event.pointerId);
    this.beginDraw();
  };

  private readonly onSurfacePointerUp = (event: PointerEvent) => {
    if (event.pointerId !== this.activeDrawPointerId) {
      return;
    }

    event.preventDefault();
    this.activeDrawPointerId = null;
    safeReleasePointerCapture(this.sceneHost, event.pointerId);
    void this.releaseDraw();
  };

  private readonly onSurfacePointerCancel = (event: PointerEvent) => {
    if (event.pointerId !== this.activeDrawPointerId) {
      return;
    }

    this.activeDrawPointerId = null;
    safeReleasePointerCapture(this.sceneHost, event.pointerId);
    this.cancelDraw();
  };

  private readonly onWindowPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== this.activeDrawPointerId) {
      return;
    }

    this.activeDrawPointerId = null;
    void this.releaseDraw();
  };

  private readonly onWindowPointerCancel = (event: PointerEvent) => {
    if (event.pointerId !== this.activeDrawPointerId) {
      return;
    }

    this.activeDrawPointerId = null;
    this.cancelDraw();
  };

  private async initializeAdapter(): Promise<void> {
    const preferred = resolveInputMode(this.options.settings.preferredInput);
    this.adapter = preferred === 'desktop' ? new DesktopAimInput() : new TouchAimInput();
    this.adapter.setCalibration(null);
    this.adapter.start();
    this.adapter.attachSurface(this.sceneHost);
  }

  private loop = () => {
    if (this.destroyed) {
      return;
    }

    const now = performance.now();
    const nextProgress = getPlayerProgress(this.options.records, this.arrowIndex);
    if (nextProgress.level !== this.progress.level) {
      this.scene.setArrowTheme(nextProgress.arrowTheme);
    }
    this.progress = nextProgress;

    const frame = this.composeAimFrame(now);

    if (this.drawing) {
      this.drawStabilityWindow.push(frame.effectiveStability);
      if (this.drawStabilityWindow.length > 90) {
        this.drawStabilityWindow.shift();
      }
    }

    if (this.impactBriefing && now >= this.impactBriefingUntil) {
      this.impactBriefing = null;
    }
    if (this.scoreFlash && now >= this.scoreFlashUntil) {
      this.scoreFlash = null;
    }

    const drawVisualRatio = Math.min(frame.drawDuration / 0.92, 1);
    const scopeRatio = this.drawing ? Math.min(frame.drawDuration / 0.24, 1) : 0;
    if (!this.paused) {
      this.scene.frame(frame.snapshot, drawVisualRatio, scopeRatio);
    }

    this.hud.update({
      modeLabel: `${this.mode.badgeEmoji} ${this.mode.shortTitle}`,
      arrowIndex: this.arrowIndex,
      arrowCount: this.mode.arrowCount,
      totalScore: this.totalScore,
      rivalName: this.rival?.name ?? null,
      rivalScore: this.rivalTotalScore,
      xCount: this.xCount,
      windLabel: this.windSystem.describe(this.currentWind),
      levelLabel: `Lv.${this.progress.level}`,
      paused: this.paused,
      debugEnabled: this.options.settings.debugOverlay,
      snapshot: frame.snapshot,
      tension: frame.tension,
      releaseTiming: frame.releaseTiming,
      drawing: this.drawing,
      turnLabel: this.rivalTurn ? `${this.rival?.name ?? '\uc0c1\ub300'} \ucc28\ub840` : `${this.getPlayerDisplayName()} \ucc28\ub840`,
      impactBriefing: this.impactBriefing,
      scoreFlash: this.scoreFlash,
    });

    this.frameHandle = window.requestAnimationFrame(this.loop);
  };

  private beginDraw(): void {
    if (this.drawing || this.animating || this.paused || this.arrowIndex >= this.mode.arrowCount) {
      return;
    }

    void this.options.audio.resume();
    this.drawStabilityWindow = [];
    this.drawing = true;
    this.drawStartedAt = performance.now();
  }

  private async releaseDraw(): Promise<void> {
    if (!this.drawing || this.animating || this.paused || !this.adapter) {
      return;
    }

    const frame = this.composeAimFrame(performance.now());
    const stability = average(this.drawStabilityWindow.length > 0 ? this.drawStabilityWindow : [frame.effectiveStability]);
    const releaseQuality = clamp(frame.releaseTiming * 0.78 + stability * 0.16 + pullBonus(frame.drawDuration) * 0.06, 0.15, 1);
    const shotPath = simulateArrowFlight({
      aimYaw: frame.snapshot.yaw,
      aimPitch: frame.snapshot.pitch,
      drawDuration: Math.max(0.35, frame.drawDuration),
      wind: this.currentWind * this.mode.windInfluence,
      stability,
      releaseQuality,
    });
    const impactResolution = resolveImpactPlacement(shotPath.hitX, shotPath.hitY, this.hitHistory);
    applyImpactOffset(shotPath.path, impactResolution.hitX - shotPath.hitX, impactResolution.hitY - shotPath.hitY);
    shotPath.hitX = impactResolution.hitX;
    shotPath.hitY = impactResolution.hitY;
    const shotScore = scoreTarget(shotPath.hitX, shotPath.hitY);

    this.drawing = false;
    this.animating = true;
    this.options.audio.playShot();
    this.options.haptics.pulse(12);
    await this.scene.playShot(shotPath.path, shotPath.hitX, shotPath.hitY);
    if (this.destroyed) {
      return;
    }

    this.options.audio.playImpact(shotScore.score >= 9 || Boolean(impactResolution.specialLabel));
    this.options.haptics.pulse(
      impactResolution.specialLabel
        ? [18, 28, 18, 28, 22]
        : shotScore.isX
          ? [14, 26, 18, 30, 18]
          : shotScore.score >= 9
            ? [16, 30, 18]
            : 12,
    );

    this.arrowScores.push(shotScore.score);
    this.totalScore += shotScore.score;
    if (shotScore.isX) {
      this.xCount += 1;
    }
    this.stabilitySamples.push(stability);
    this.releaseSamples.push(releaseQuality);
    this.hitHistory.push({ x: shotPath.hitX, y: shotPath.hitY });
    this.lowScoreStreak = shotScore.score <= 5 ? this.lowScoreStreak + 1 : 0;
    this.arrowIndex += 1;

    this.setScoreFlash(
      createScoreFlash({
        owner: 'player',
        shooterLabel: this.getPlayerDisplayName(),
        score: shotScore.score,
        isX: shotScore.isX,
        playerTotal: this.totalScore,
        rivalName: this.rival?.name ?? null,
        rivalTotal: this.rivalTotalScore,
        isSpecial: Boolean(impactResolution.specialLabel),
      }),
    );

    this.impactBriefing = createImpactBriefing(
      this.mode.locationLabel,
      shotScore.score,
      shotScore.isX,
      shotPath.hitX,
      shotPath.hitY,
      impactResolution.specialLabel,
    );
    this.impactBriefingUntil = performance.now() + 1200;

    if (shotScore.score === 10 && !this.seenTen) {
      this.seenTen = true;
      await this.options.onStoryTrigger({ type: 'first_ten', mode: this.mode.id });
    }
    if (shotScore.isX && !this.seenBullseye) {
      this.seenBullseye = true;
      await this.options.onStoryTrigger({ type: 'first_bullseye', mode: this.mode.id });
    }
    if (this.lowScoreStreak >= 2) {
      await this.options.onStoryTrigger({ type: 'low_score_streak', mode: this.mode.id });
      this.lowScoreStreak = 0;
    }

    if (this.arrowIndex >= this.mode.arrowCount) {
      this.finishMatch();
      return;
    }

    this.currentWind = this.windSystem.next(this.arrowIndex);
    this.arrowPatternSeed = Math.random() * Math.PI * 2;
    this.animating = false;
    if (this.rival) {
      this.animating = true;
      void this.runRivalTurn();
    }
  }

  private cancelDraw(): void {
    this.drawing = false;
    this.drawStabilityWindow = [];
  }

  private async runRivalTurn(): Promise<void> {
    if (!this.rival || this.rivalArrowScores.length >= this.mode.arrowCount) {
      this.rivalTurn = false;
      this.animating = false;
      return;
    }

    this.rivalTurn = true;
    this.impactBriefing = createRivalAimBriefing(this.rival.name, this.rival.title);
    this.impactBriefingUntil = Number.POSITIVE_INFINITY;

    const canShoot = await this.waitForUnpausedDuration(randomInt(500, 1500));
    if (!canShoot || !this.rival) {
      this.rivalTurn = false;
      this.animating = false;
      this.impactBriefing = null;
      return;
    }

    const shot = createRivalShot(this.mode.id, this.rivalArrowScores.length);
    if (!shot) {
      this.rivalTurn = false;
      this.animating = false;
      this.impactBriefing = null;
      return;
    }

    await this.scene.playRivalShot(shot.hitX, shot.hitY);
    if (this.destroyed || !this.rival) {
      return;
    }

    this.rivalArrowScores.push(shot.score);
    this.rivalTotalScore += shot.score;
    this.setScoreFlash(
      createScoreFlash({
        owner: 'rival',
        shooterLabel: this.rival.name,
        score: shot.score,
        isX: shot.isX,
        playerTotal: this.totalScore,
        rivalName: this.rival.name,
        rivalTotal: this.rivalTotalScore,
        isSpecial: false,
      }),
    );
    this.impactBriefing = createImpactBriefing(this.rival.name, shot.score, shot.isX, shot.hitX, shot.hitY);
    this.impactBriefingUntil = performance.now() + 1100;
    this.rivalTurn = false;
    this.animating = false;
  }

  private finishMatch(): void {
    const resultBand = getResultBand(this.mode.id, this.totalScore);
    const record: MatchRecord = {
      id: createRecordId(),
      mode: this.mode.id,
      totalScore: this.totalScore,
      arrowScores: [...this.arrowScores],
      xCount: this.xCount,
      averageStability: average(this.stabilitySamples),
      averageReleaseQuality: average(this.releaseSamples),
      matchDurationMs: Date.now() - this.startedAt,
      windSummary: this.windSystem.describe(this.currentWind),
      timestamp: Date.now(),
      calibrationVersion: this.options.calibration?.version ?? 0,
      resultBand,
      rivalId: this.rival?.id ?? null,
      rivalName: this.rival?.name ?? null,
      rivalTotalScore: this.rivalTotalScore,
      didBeatRival: this.rival ? this.totalScore >= this.rivalTotalScore : null,
    };

    const summary: MatchSummary = {
      record,
      isPersonalBest: isPersonalBest(record, this.options.records),
      hallOfFameRank: getScoreRank(record, this.options.records),
      unlockedMode: getUnlockedNextMode(this.mode.id, this.totalScore),
      resultBand,
      rivalId: this.rival?.id ?? null,
      rivalName: this.rival?.name ?? null,
      rivalTotalScore: this.rivalTotalScore,
      rivalArrowScores: [...this.rivalArrowScores],
      didBeatRival: this.rival ? this.totalScore >= this.rivalTotalScore : null,
    };

    this.animating = false;
    this.options.onComplete(summary);
  }

  private recenter(): void {
    this.adapter?.recenter();
  }

  private togglePause(): void {
    this.paused = !this.paused;
    if (this.paused) {
      this.cancelDraw();
    }
    this.pauseOverlay.hidden = !this.paused;
  }

  private getPlayerDisplayName(): string {
    const trimmed = this.options.settings.profileName.trim();
    return trimmed.length > 0 ? trimmed : '\uc815\uc6b0';
  }

  private setScoreFlash(flash: MatchScoreFlash): void {
    this.scoreFlash = flash;
    this.scoreFlashUntil = performance.now() + 540;
  }

  private async waitForUnpausedDuration(durationMs: number): Promise<boolean> {
    let remaining = durationMs;

    while (remaining > 0) {
      if (this.destroyed) {
        return false;
      }

      if (this.paused) {
        await delay(60);
        continue;
      }

      const step = Math.min(remaining, 60);
      await delay(step);
      remaining -= step;
    }

    return !this.destroyed;
  }

  private composeAimFrame(now: number): AimFrameState {
    const fallback: AimSnapshot = {
      source: 'touch',
      rawYaw: 0,
      rawPitch: 0,
      yaw: 0,
      pitch: 0,
      smoothedYaw: 0,
      smoothedPitch: 0,
      stability: 1,
    };
    const base = this.adapter?.getSnapshot() ?? fallback;
    const drawDuration = this.drawing ? (now - this.drawStartedAt) / 1000 : 0;
    const tremor = this.computeTremor(now, drawDuration, base.stability);
    const effectiveStability = clamp(base.stability * 0.72 + tremor.releaseTiming * 0.28 - tremor.tension * 0.03, 0, 1);

    return {
      snapshot: {
        ...base,
        yaw: base.yaw + tremor.offsetYaw,
        pitch: base.pitch + tremor.offsetPitch,
        smoothedYaw: base.smoothedYaw + tremor.offsetYaw,
        smoothedPitch: base.smoothedPitch + tremor.offsetPitch,
        stability: effectiveStability,
      },
      drawDuration,
      tension: tremor.tension,
      releaseTiming: tremor.releaseTiming,
      effectiveStability,
    };
  }

  private computeTremor(now: number, drawDuration: number, baseStability: number) {
    if (!this.drawing) {
      return { offsetYaw: 0, offsetPitch: 0, tension: 0, releaseTiming: 1 };
    }

    const time = now / 1000;
    const tension = clamp(drawDuration / 1.38, 0, 1.08);
    const amplitude =
      (0.008 + tension * 0.034) * (1.04 - baseStability * 0.16) * this.mode.tremorMultiplier * this.progress.tremorMultiplier;
    const offsetYaw =
      Math.sin(time * 8.4 + this.arrowPatternSeed) * amplitude +
      Math.sin(time * 12.6 + this.arrowPatternSeed * 0.5) * amplitude * 0.38;
    const offsetPitch =
      Math.cos(time * 7.7 + this.arrowPatternSeed * 1.7) * amplitude * 0.8 +
      Math.cos(time * 11.4 + this.arrowPatternSeed * 0.8) * amplitude * 0.3;
    const timingRadius = Math.max(amplitude * 1.9, 0.0001);
    const releaseTiming = clamp(1 - Math.hypot(offsetYaw, offsetPitch) / timingRadius, 0, 1);

    return { offsetYaw, offsetPitch, tension, releaseTiming };
  }
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function resolveInputMode(preferred: AppSettings['preferredInput']): 'desktop' | 'touch' {
  if (preferred === 'desktop' || preferred === 'touch') {
    return preferred;
  }
  return supportsFinePointer() ? 'desktop' : 'touch';
}

function supportsFinePointer(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
}

function pullBonus(drawDuration: number): number {
  return clamp(drawDuration / 0.74, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createImpactBriefing(
  locationLabel: string,
  score: number,
  isX: boolean,
  hitX: number,
  hitY: number,
  specialLabel?: string,
): MatchImpactBriefing {
  const tone = getImpactTone(score, isX, specialLabel);

  if (score <= 0) {
    return {
      tone,
      icon: '\ud83d\udca8',
      tag: '\ubc97\uc5b4\ub0a8',
      headline: `${locationLabel} \uc0ac\uc815`,
      detail: '\ud45c\uc801 \ubc14\uae65',
      scoreText: 'MISS',
      isHighlight: false,
      specialLabel,
    };
  }

  const direction = describeImpactZone(hitX, hitY);
  const ring = describeRing(score, isX);

  return {
    tone,
    icon: getImpactIcon(tone),
    tag: tone === 'overlap' ? '\uc911\ucca9' : tone === 'x' ? 'X-RING' : tone === 'ten' ? '10-RING' : '\uc801\uc911',
    headline: tone === 'overlap' ? '\uac19\uc740 \uc790\ub9ac \uc911\ucca9' : `${locationLabel} ${ring}`,
    detail: `${direction} · ${ring}`,
    scoreText: isX ? 'X' : `${score}`,
    isHighlight: score >= 9 || Boolean(specialLabel),
    specialLabel,
  };
}

function createRivalAimBriefing(rivalName: string, rivalTitle: string): MatchImpactBriefing {
  return {
    tone: 'normal',
    icon: '\ud83c\udfaf',
    tag: '\uc0c1\ub300 \uc870\uc900',
    headline: `${rivalName} \uc870\uc900 \uc911`,
    detail: `${rivalTitle}\uac00 \ud638\ud761\uc744 \uace0\ub974\uace0 \uc788\uc5b4\uc694.`,
    scoreText: '...',
    isHighlight: false,
  };
}

function getImpactTone(score: number, isX: boolean, specialLabel?: string): MatchImpactBriefing['tone'] {
  if (specialLabel) {
    return 'overlap';
  }
  if (score <= 0) {
    return 'miss';
  }
  if (isX) {
    return 'x';
  }
  if (score === 10) {
    return 'ten';
  }
  return 'normal';
}

function getImpactIcon(tone: MatchImpactBriefing['tone']): string {
  switch (tone) {
    case 'overlap':
      return '\ud83d\udd25';
    case 'x':
      return '\u2728';
    case 'ten':
      return '\ud83c\udfc5';
    case 'miss':
      return '\ud83d\udcab';
    default:
      return '\ud83c\udfaf';
  }
}

function describeRing(score: number, isX: boolean): string {
  if (isX) {
    return 'X\ub9c1';
  }
  if (score >= 9) {
    return '\uace8\ub4dc \ub9c1';
  }
  if (score >= 7) {
    return '\ub808\ub4dc \ub9c1';
  }
  if (score >= 5) {
    return '\ube14\ub8e8 \ub9c1';
  }
  if (score >= 3) {
    return '\ube14\ub799 \ub9c1';
  }
  return '\ud654\uc774\ud2b8 \ub9c1';
}

function describeImpactZone(hitX: number, hitY: number): string {
  const distance = Math.hypot(hitX, hitY);
  if (distance < 0.08) {
    return '\uc815\uc911\uc559';
  }

  const horizontal = Math.abs(hitX) > 0.08 ? (hitX > 0 ? '\uc624\ub978\ucabd' : '\uc67c\ucabd') : '';
  const vertical = Math.abs(hitY) > 0.08 ? (hitY > 0 ? '\uc704' : '\uc544\ub798') : '';
  if (horizontal && vertical) {
    return `${horizontal} ${vertical}`;
  }
  if (horizontal) {
    return horizontal;
  }
  if (vertical) {
    return vertical;
  }
  return '\uc911\uc559';
}

function resolveImpactPlacement(
  hitX: number,
  hitY: number,
  hitHistory: Array<{ x: number; y: number }>,
): { hitX: number; hitY: number; specialLabel?: string } {
  const previous = hitHistory.find((entry) => Math.hypot(hitX - entry.x, hitY - entry.y) < 0.1);
  if (!previous) {
    return { hitX, hitY };
  }

  const distance = Math.hypot(hitX - previous.x, hitY - previous.y);
  if (distance < 0.038 && Math.random() < 0.05) {
    return {
      hitX,
      hitY,
      specialLabel: '\ud654\uc0b4\uc774 \uac70\uc758 \uac19\uc740 \uc790\ub9ac\uc5d0 \ub2e4\uc2dc \uaf42\ud614\uc5b4\uc694.',
    };
  }

  const angle = distance < 0.0001 ? Math.random() * Math.PI * 2 : Math.atan2(hitY - previous.y, hitX - previous.x);
  const adjustedX = previous.x + Math.cos(angle) * (0.085 + Math.random() * 0.03);
  const adjustedY = previous.y + Math.sin(angle) * (0.085 + Math.random() * 0.03);
  return clampImpactToTarget(adjustedX, adjustedY);
}

function clampImpactToTarget(hitX: number, hitY: number): { hitX: number; hitY: number } {
  const distance = Math.hypot(hitX, hitY);
  const maxRadius = TARGET_RADIUS - 0.02;
  if (distance <= maxRadius) {
    return { hitX, hitY };
  }

  const ratio = maxRadius / Math.max(distance, 0.0001);
  return { hitX: hitX * ratio, hitY: hitY * ratio };
}

function applyImpactOffset(path: Array<{ x: number; y: number }>, deltaX: number, deltaY: number): void {
  if (Math.abs(deltaX) < 0.0001 && Math.abs(deltaY) < 0.0001) {
    return;
  }

  for (let index = Math.max(0, path.length - 3); index < path.length; index += 1) {
    path[index].x += deltaX;
    path[index].y += deltaY;
  }
}

function createScoreFlash(options: {
  owner: MatchScoreFlash['owner'];
  shooterLabel: string;
  score: number;
  isX: boolean;
  playerTotal: number;
  rivalName: string | null;
  rivalTotal: number;
  isSpecial: boolean;
}): MatchScoreFlash {
  const scoreText = options.score <= 0 ? 'MISS' : options.isX ? 'X' : `${options.score}`;
  const totalsText = options.rivalName
    ? `\ub0b4 ${options.playerTotal} : ${options.rivalName} ${options.rivalTotal}`
    : `\ucd1d\uc810 ${options.playerTotal}`;
  const tone = getScoreFlashTone(options.score, options.isX, options.isSpecial);

  return {
    owner: options.owner,
    label: options.shooterLabel,
    scoreText,
    totalsText,
    tone,
    isShowy: tone === 'high' || tone === 'perfect',
  };
}

function getScoreFlashTone(score: number, isX: boolean, isSpecial: boolean): MatchScoreFlash['tone'] {
  if (score <= 0) {
    return 'miss';
  }
  if (isX || isSpecial || score === 10) {
    return 'perfect';
  }
  if (score >= 8) {
    return 'high';
  }
  return 'normal';
}

function createRecordId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `record-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function safeSetPointerCapture(node: HTMLElement, pointerId: number): void {
  try {
    node.setPointerCapture?.(pointerId);
  } catch {
    // Some browsers reject pointer capture when the pointer is already released.
  }
}

function safeReleasePointerCapture(node: HTMLElement, pointerId: number): void {
  try {
    if (!node.hasPointerCapture || node.hasPointerCapture(pointerId)) {
      node.releasePointerCapture?.(pointerId);
    }
  } catch {
    // A missed release should not break the whole match loop.
  }
}

function delay(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

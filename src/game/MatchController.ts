import { getModeConfig, getResultBand, shouldUnlockRanking72 } from '../data/modes';
import { getScoreRank, isPersonalBest } from '../data/records';
import { DesktopAimInput } from '../input/DesktopAimInput';
import { TouchAimInput } from '../input/TouchAimInput';
import type { AimInputAdapter, AimSnapshot } from '../input/types';
import { AudioService } from '../services/AudioService';
import { HapticsService } from '../services/HapticsService';
import type { StoryTrigger } from '../story/types';
import type { AppSettings, CalibrationProfile, MatchRecord, ModeId } from '../types';
import { element, type ScreenController } from '../ui/dom';
import { MatchHUD } from '../ui/MatchHUD';
import { simulateArrowFlight } from './Ballistics';
import { ArcheryScene } from './ArcheryScene';
import { scoreTarget } from './Scoring';
import type { MatchSummary } from './types';
import { WindSystem } from './WindSystem';

interface MatchControllerOptions {
  modeId: ModeId;
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
  private readonly windSystem = new WindSystem();
  private readonly hud: MatchHUD;
  private readonly scene: ArcheryScene;
  private adapter: AimInputAdapter | null = null;
  private frameHandle = 0;
  private drawStartedAt = 0;
  private drawing = false;
  private animating = false;
  private paused = false;
  private arrowIndex = 0;
  private totalScore = 0;
  private xCount = 0;
  private currentWind = this.windSystem.next(0);
  private readonly arrowScores: number[] = [];
  private readonly stabilitySamples: number[] = [];
  private readonly releaseSamples: number[] = [];
  private drawStabilityWindow: number[] = [];
  private lowScoreStreak = 0;
  private seenTen = false;
  private seenBullseye = false;
  private readonly startedAt = Date.now();
  private arrowPatternSeed = Math.random() * Math.PI * 2;

  constructor(private readonly options: MatchControllerOptions) {
    this.mode = getModeConfig(this.options.modeId);
    const root = element('section', 'screen match-screen');
    const surface = element('div', 'match-surface');
    this.hud = new MatchHUD({
      onDrawStart: () => this.beginDraw(),
      onDrawRelease: () => void this.releaseDraw(),
      onPauseToggle: () => this.togglePause(),
      onRecenter: () => this.recenter(),
      onQuit: options.onQuit,
    });

    this.pauseOverlay.innerHTML = `
      <div class="panel pause-card">
        <h2 class="section-title">잠시 숨 고르기</h2>
        <p class="muted-text">다시 누르면 바로 경기로 돌아갑니다.</p>
      </div>
    `;
    this.pauseOverlay.hidden = true;
    surface.append(this.sceneHost, this.hud.element, this.pauseOverlay);
    root.append(surface);
    this.element = root;
    this.scene = new ArcheryScene(this.sceneHost, options.settings.reduceMotion);

    void this.initializeAdapter();
    window.addEventListener('keydown', this.onKeyDown);
    this.loop();
  }

  public destroy(): void {
    window.cancelAnimationFrame(this.frameHandle);
    window.removeEventListener('keydown', this.onKeyDown);
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

  private async initializeAdapter(): Promise<void> {
    const preferred = resolveInputMode(this.options.settings.preferredInput);
    this.adapter = preferred === 'desktop' ? new DesktopAimInput() : new TouchAimInput();
    this.adapter.setCalibration(null);
    this.adapter.start();
    this.adapter.attachSurface(this.sceneHost);
  }

  private loop = () => {
    const frame = this.composeAimFrame(performance.now());

    if (this.drawing) {
      this.drawStabilityWindow.push(frame.effectiveStability);
      if (this.drawStabilityWindow.length > 90) {
        this.drawStabilityWindow.shift();
      }
    }

    const drawVisualRatio = Math.min(frame.drawDuration / 0.9, 1);
    const scopeRatio = this.drawing ? Math.min(frame.drawDuration / 0.35, 1) : 0;
    if (!this.paused) {
      this.scene.frame(frame.snapshot, drawVisualRatio, scopeRatio);
    }

    this.hud.update({
      arrowIndex: this.arrowIndex,
      arrowCount: this.mode.arrowCount,
      totalScore: this.totalScore,
      xCount: this.xCount,
      windLabel: this.windSystem.describe(this.currentWind),
      paused: this.paused,
      debugEnabled: this.options.settings.debugOverlay,
      snapshot: frame.snapshot,
      tension: frame.tension,
      releaseTiming: frame.releaseTiming,
      drawing: this.drawing,
    });

    this.frameHandle = window.requestAnimationFrame(this.loop);
  };

  private beginDraw(): void {
    if (this.animating || this.paused || this.arrowIndex >= this.mode.arrowCount) {
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
    const releaseQuality = clamp(frame.releaseTiming * 0.74 + stability * 0.18 + pullBonus(frame.drawDuration) * 0.08, 0.15, 1);
    const shotPath = simulateArrowFlight({
      aimYaw: frame.snapshot.yaw,
      aimPitch: frame.snapshot.pitch,
      drawDuration: Math.max(0.35, frame.drawDuration),
      wind: this.currentWind,
      stability,
      releaseQuality,
    });
    const shotScore = scoreTarget(shotPath.hitX, shotPath.hitY);

    this.drawing = false;
    this.animating = true;
    this.options.audio.playShot();
    this.options.haptics.pulse(12);
    await this.scene.playShot(shotPath.path, shotPath.hitX, shotPath.hitY);
    this.options.audio.playImpact(shotScore.score >= 9);
    this.options.haptics.pulse(shotScore.score >= 9 ? [16, 30, 18] : 12);

    this.arrowScores.push(shotScore.score);
    this.totalScore += shotScore.score;
    if (shotScore.isX) {
      this.xCount += 1;
    }
    this.stabilitySamples.push(stability);
    this.releaseSamples.push(releaseQuality);
    this.lowScoreStreak = shotScore.score <= 5 ? this.lowScoreStreak + 1 : 0;
    this.arrowIndex += 1;

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
    };

    const summary: MatchSummary = {
      record,
      isPersonalBest: isPersonalBest(record, this.options.records),
      hallOfFameRank: getScoreRank(record, this.options.records),
      unlockedMode: shouldUnlockRanking72(this.mode.id, this.totalScore) ? 'ranking72' : null,
      resultBand,
    };

    this.animating = false;
    this.options.onComplete(summary);
  }

  private recenter(): void {
    this.adapter?.recenter();
  }

  private togglePause(): void {
    this.paused = !this.paused;
    this.pauseOverlay.hidden = !this.paused;
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
    const effectiveStability = clamp(base.stability * 0.7 + tremor.releaseTiming * 0.3 - tremor.tension * 0.035, 0, 1);

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
    const tension = clamp(drawDuration / 1.28, 0, 1.08);
    const amplitude = (0.005 + tension * 0.03) * (1.02 - baseStability * 0.18);
    const offsetYaw =
      Math.sin(time * 8.7 + this.arrowPatternSeed) * amplitude +
      Math.sin(time * 13.3 + this.arrowPatternSeed * 0.5) * amplitude * 0.42;
    const offsetPitch =
      Math.cos(time * 7.9 + this.arrowPatternSeed * 1.7) * amplitude * 0.84 +
      Math.cos(time * 12.2 + this.arrowPatternSeed * 0.8) * amplitude * 0.34;
    const timingRadius = Math.max(amplitude * 1.8, 0.0001);
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
  return clamp(drawDuration / 0.72, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createRecordId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `record-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

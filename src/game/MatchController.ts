import { getModeConfig, getResultBand, shouldUnlockRanking72 } from '../data/modes';
import { getScoreRank, isPersonalBest } from '../data/records';
import { DesktopAimInput } from '../input/DesktopAimInput';
import { SensorAimInput } from '../input/SensorAimInput';
import { TouchAimInput } from '../input/TouchAimInput';
import type { AimInputAdapter } from '../input/types';
import type { StoryTrigger } from '../story/types';
import type { AppSettings, CalibrationProfile, MatchRecord, ModeId } from '../types';
import { AudioService } from '../services/AudioService';
import { HapticsService } from '../services/HapticsService';
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

    this.pauseOverlay.innerHTML = `<div class="panel pause-card"><h2 class="section-title">일시정지</h2><p>숨을 가다듬고 다시 이어갈 수 있습니다.</p></div>`;
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
    const preferred = this.options.calibration?.inputMode ?? guessInputMode(this.options.settings.preferredInput);
    this.adapter = await this.buildAdapter(preferred);
    this.adapter.setCalibration(this.options.calibration);
    this.adapter.start();
    this.adapter.attachSurface(this.sceneHost);
  }

  private async buildAdapter(mode: CalibrationProfile['inputMode']): Promise<AimInputAdapter> {
    if (mode === 'sensor') {
      const sensor = new SensorAimInput();
      const permission = sensor.requestPermission ? await sensor.requestPermission() : 'granted';
      if (permission === 'granted') {
        return sensor;
      }
    }

    if (mode === 'desktop' || supportsFinePointer()) {
      return new DesktopAimInput();
    }

    return new TouchAimInput();
  }

  private loop = () => {
    const snapshot = this.adapter?.getSnapshot() ?? {
      source: 'touch',
      rawYaw: 0,
      rawPitch: 0,
      yaw: 0,
      pitch: 0,
      smoothedYaw: 0,
      smoothedPitch: 0,
      stability: 1,
    };
    const drawRatio = this.drawing ? Math.min((performance.now() - this.drawStartedAt) / 1300, 1) : 0;

    if (this.drawing) {
      this.drawStabilityWindow.push(snapshot.stability);
      if (this.drawStabilityWindow.length > 90) {
        this.drawStabilityWindow.shift();
      }
    }

    if (!this.paused) {
      this.scene.frame(snapshot, drawRatio);
    }

    this.hud.update({
      arrowIndex: this.arrowIndex,
      arrowCount: this.mode.arrowCount,
      totalScore: this.totalScore,
      xCount: this.xCount,
      windLabel: this.windSystem.describe(this.currentWind),
      inputMode: snapshot.source,
      paused: this.paused,
      debugEnabled: this.options.settings.debugOverlay,
      snapshot,
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

    const snapshot = this.adapter.getSnapshot();
    const drawDuration = (performance.now() - this.drawStartedAt) / 1000;
    const stability = average(this.drawStabilityWindow.length > 0 ? this.drawStabilityWindow : [snapshot.stability]);
    const releaseQuality = Math.max(0.15, 1 - Math.abs(drawDuration - 0.95) / 1.1) * 0.65 + stability * 0.35;
    const shotPath = simulateArrowFlight({
      aimYaw: snapshot.yaw,
      aimPitch: snapshot.pitch,
      drawDuration,
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
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function guessInputMode(preferred: AppSettings['preferredInput']): CalibrationProfile['inputMode'] {
  if (preferred !== 'auto') {
    return preferred;
  }
  return supportsFinePointer() ? 'desktop' : 'touch';
}

function supportsFinePointer(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
}

function createRecordId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `record-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

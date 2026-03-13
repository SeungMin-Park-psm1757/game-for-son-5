import { buildRoute, parseModeId, parseRoute } from './routes';
import { loadSnapshot, resetScope, saveRecords, saveSettings, saveStoryFlags, saveUnlockedModes } from '../persistence/storage';
import { StoryEngine } from '../story/StoryEngine';
import { StoryOverlay } from '../story/StoryOverlay';
import { AudioService } from '../services/AudioService';
import { HapticsService } from '../services/HapticsService';
import { createHomeHallOfFame } from '../ui/HomeHallOfFame';
import { showResetConfirmModal } from '../ui/ResetConfirmModal';
import { createResultScreen } from '../ui/ResultScreen';
import { createSettingsScreen } from '../ui/SettingsScreen';
import { presentQuizGate } from '../ui/QuizGate';
import { clearNode, type ScreenController } from '../ui/dom';
import { createHomeSupportSession } from '../data/homeSupport';
import { getDailyGoalStatuses, getGoalTitle, getNewlyCompletedGoalIds } from '../data/dailyGoals';
import { createRivalIntroEvent, parseRivalId, pickRandomRival } from '../data/rival';
import type { MatchSummary } from '../game/types';
import { MatchController } from '../game/MatchController';
import type { StoryTrigger } from '../story/types';
import type { AppStorageSnapshot, ModeId } from '../types';

export class App {
  private snapshot: AppStorageSnapshot = loadSnapshot();
  private readonly screenHost = document.createElement('div');
  private readonly overlayHost = document.createElement('div');
  private readonly overlay = new StoryOverlay(this.overlayHost);
  private readonly audio = new AudioService();
  private readonly haptics = new HapticsService();
  private currentScreen: ScreenController | null = null;
  private lastResult: MatchSummary | null = null;
  private pendingResultStory: StoryTrigger | null = null;

  constructor(private readonly root: HTMLElement) {
    const shell = document.createElement('div');
    shell.className = 'app-shell';
    this.screenHost.className = 'screen-host';
    this.overlayHost.className = 'overlay-host';
    shell.append(this.screenHost, this.overlayHost);
    this.root.append(shell);

    this.normalizeMobileDefaults();
    this.syncServices();
    window.addEventListener('hashchange', () => void this.renderCurrentRoute());
    if (!window.location.hash) {
      window.location.hash = buildRoute('home');
    }
    void this.renderCurrentRoute();
  }

  private syncServices(): void {
    this.audio.setEnabled(this.snapshot.settings.audioEnabled);
    this.haptics.setEnabled(this.snapshot.settings.hapticsEnabled);
  }

  private normalizeMobileDefaults(): void {
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches &&
      this.snapshot.settings.debugOverlay
    ) {
      this.snapshot = {
        ...this.snapshot,
        settings: {
          ...this.snapshot.settings,
          debugOverlay: false,
        },
      };
      saveSettings(this.snapshot.settings);
    }
  }

  private async renderCurrentRoute(): Promise<void> {
    const route = parseRoute(window.location.hash);
    if (route.name === 'home') {
      this.mountScreen(
        createHomeHallOfFame({
          records: this.snapshot.records,
          settings: this.snapshot.settings,
          unlockedModes: this.snapshot.unlockedModes,
          supportSession: createHomeSupportSession(),
          dailyGoals: getDailyGoalStatuses(this.snapshot.records),
          onStartMode: (mode) => void this.beginMode(mode),
          onSettings: () => this.navigate(buildRoute('settings')),
          onResetHoldComplete: () =>
            showResetConfirmModal(this.overlayHost, (scope) => {
              resetScope(scope);
              this.snapshot = loadSnapshot();
              this.syncServices();
              this.navigate(buildRoute('home'));
            }),
        }),
      );
      return;
    }

    if (route.name === 'settings') {
      this.mountScreen(
        createSettingsScreen({
          settings: this.snapshot.settings,
          onSave: (settings) => {
            this.snapshot = { ...this.snapshot, settings };
            saveSettings(settings);
            this.syncServices();
          },
          onBack: () => this.navigate(buildRoute('home')),
        }),
      );
      return;
    }

    if (route.name === 'calibration') {
      this.navigate(buildRoute('home'));
      return;
    }

    if (route.name === 'match') {
      const mode = parseModeId(route.params.get('mode'));
      const rivalId = parseRivalId(route.params.get('rival'));
      const controller = new MatchController({
        modeId: mode,
        rivalId,
        calibration: this.snapshot.calibration,
        settings: this.snapshot.settings,
        records: this.snapshot.records,
        audio: this.audio,
        haptics: this.haptics,
        onQuit: () => this.navigate(buildRoute('home')),
        onStoryTrigger: async (trigger) => {
          await this.triggerStory(trigger);
        },
        onComplete: (summary) => {
          void this.handleMatchComplete(summary);
        },
      });
      this.mountScreen(controller);
      return;
    }

    if (route.name === 'result') {
      if (!this.lastResult) {
        this.navigate(buildRoute('home'));
        return;
      }

      this.mountScreen(
        createResultScreen({
          summary: this.lastResult,
          onHome: () => this.navigate(buildRoute('home')),
          onRematch: () => void this.beginMode(this.lastResult?.record.mode ?? 'practice6'),
        }),
      );

      if (this.pendingResultStory) {
        const trigger = this.pendingResultStory;
        this.pendingResultStory = null;
        await this.triggerStory(trigger);
      }
    }
  }

  private mountScreen(screen: ScreenController): void {
    this.currentScreen?.destroy?.();
    clearNode(this.screenHost);
    this.overlay.clear();
    this.currentScreen = screen;
    this.screenHost.append(screen.element);
  }

  private navigate(hash: string): void {
    window.location.hash = hash;
  }

  private async beginMode(mode: ModeId): Promise<void> {
    void this.audio.resume();
    const passed = await presentQuizGate(this.overlayHost, { modeId: mode });
    if (!passed) {
      return;
    }

    await this.triggerStory({ type: 'first_launch' });
    const rival = pickRandomRival(mode);
    if (mode !== 'practice6' && rival) {
      await this.overlay.present(createRivalIntroEvent(mode, rival.id));
    }

    this.navigate(buildRoute('match', rival ? { mode, rival: rival.id } : { mode }));
  }

  private async handleMatchComplete(summary: MatchSummary): Promise<void> {
    this.lastResult = summary;
    const previousRecords = this.snapshot.records;
    const nextRecords = [...previousRecords, summary.record];
    this.snapshot = {
      ...this.snapshot,
      records: nextRecords,
    };
    saveRecords(this.snapshot.records);

    if (summary.unlockedMode && !this.snapshot.unlockedModes.includes(summary.unlockedMode)) {
      this.snapshot = {
        ...this.snapshot,
        unlockedModes: [...this.snapshot.unlockedModes, summary.unlockedMode],
      };
      saveUnlockedModes(this.snapshot.unlockedModes);
      await this.triggerStory({
        type: 'mode_unlocked',
        mode: summary.record.mode,
        unlockedMode: summary.unlockedMode,
      });
    }

    if (summary.isPersonalBest) {
      await this.triggerStory({ type: 'personal_best', mode: summary.record.mode });
    }

    const newlyCompletedGoals = getNewlyCompletedGoalIds(previousRecords, nextRecords);
    if (newlyCompletedGoals.length > 0) {
      await this.overlay.present({
        id: `daily-goal-${Date.now()}`,
        delivery: 'overlay',
        priority: 1,
        trigger: { type: 'first_launch' },
        lines: [
          {
            speaker: '세연',
            portraitKey: 'char_seyeon',
            text:
              newlyCompletedGoals.length > 1
                ? `오빠, 오늘 목표를 ${newlyCompletedGoals.length}개나 끝냈어! 완전 기세 좋다!`
                : '오빠, 오늘 목표 하나 달성! 이 흐름 너무 좋다!',
          },
          {
            speaker: '엄마',
            portraitKey: 'char_mom',
            text:
              newlyCompletedGoals.length > 1
                ? newlyCompletedGoals.map((goalId) => getGoalTitle(goalId)).join(' · ')
                : `${getGoalTitle(newlyCompletedGoals[0]!)} 달성. 지금 리듬 그대로 이어가자.`,
          },
        ],
      });
    }

    const storyEngine = new StoryEngine(this.snapshot.storyFlags);
    this.snapshot = {
      ...this.snapshot,
      storyFlags: storyEngine.incrementMatchCount(),
    };
    saveStoryFlags(this.snapshot.storyFlags);
    this.pendingResultStory = {
      type: 'match_end',
      mode: summary.record.mode,
      resultBand: summary.resultBand,
    };
    this.navigate(buildRoute('result'));
  }

  private async triggerStory(trigger: StoryTrigger): Promise<void> {
    const engine = new StoryEngine(this.snapshot.storyFlags);
    const event = engine.pickEvent(trigger);
    if (!event) {
      return;
    }

    await this.overlay.present(event);
    this.snapshot = {
      ...this.snapshot,
      storyFlags: engine.markShown(event),
    };
    saveStoryFlags(this.snapshot.storyFlags);
  }
}

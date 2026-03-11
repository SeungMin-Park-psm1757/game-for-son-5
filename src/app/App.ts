import { buildRoute, parseModeId, parseRoute } from './routes';
import { loadSnapshot, resetScope, saveCalibration, saveRecords, saveSettings, saveStoryFlags, saveUnlockedModes } from '../persistence/storage';
import { StoryEngine } from '../story/StoryEngine';
import { StoryOverlay } from '../story/StoryOverlay';
import { AudioService } from '../services/AudioService';
import { HapticsService } from '../services/HapticsService';
import { createCalibrationScreen } from '../ui/CalibrationScreen';
import { createHomeHallOfFame } from '../ui/HomeHallOfFame';
import { showResetConfirmModal } from '../ui/ResetConfirmModal';
import { createResultScreen } from '../ui/ResultScreen';
import { createSettingsScreen } from '../ui/SettingsScreen';
import { clearNode, type ScreenController } from '../ui/dom';
import type { MatchSummary } from '../game/types';
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
  private pendingMode: ModeId | null = null;
  private pendingResultStory: StoryTrigger | null = null;

  constructor(private readonly root: HTMLElement) {
    const shell = document.createElement('div');
    shell.className = 'app-shell';
    this.screenHost.className = 'screen-host';
    this.overlayHost.className = 'overlay-host';
    shell.append(this.screenHost, this.overlayHost);
    this.root.append(shell);

    this.syncServices();
    window.addEventListener('hashchange', () => void this.renderCurrentRoute());
    if (!window.location.hash) {
      window.location.hash = buildRoute('home');
    } else {
      void this.renderCurrentRoute();
    }
  }

  private syncServices(): void {
    this.audio.setEnabled(this.snapshot.settings.audioEnabled);
    this.haptics.setEnabled(this.snapshot.settings.hapticsEnabled);
  }

  private async renderCurrentRoute(): Promise<void> {
    const route = parseRoute(window.location.hash);
    if (route.name === 'home') {
      this.mountScreen(
        createHomeHallOfFame({
          records: this.snapshot.records,
          calibration: this.snapshot.calibration,
          settings: this.snapshot.settings,
          homeComment: new StoryEngine(this.snapshot.storyFlags).getRandomHomeComment().lines[0],
          ranking72Unlocked: this.snapshot.unlockedModes.includes('ranking72'),
          onPractice: () => void this.beginMode('practice6'),
          onChallenge: () => void this.beginMode('trial12'),
          onSync: () => {
            this.pendingMode = null;
            this.navigate(buildRoute('calibration', { flow: this.snapshot.calibration ? 'quick' : 'full' }));
          },
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
      const flow = route.params.get('flow') === 'quick' ? 'quick' : 'full';
      this.mountScreen(
        createCalibrationScreen({
          flow,
          existingCalibration: this.snapshot.calibration,
          settings: this.snapshot.settings,
          onCancel: () => this.navigate(buildRoute('home')),
          onComplete: async (profile, settings) => {
            this.snapshot = {
              ...this.snapshot,
              calibration: profile,
              settings,
            };
            saveCalibration(profile);
            saveSettings(settings);
            this.syncServices();
            await this.triggerStory({ type: 'first_calibration_complete' });
            const nextMode = this.pendingMode ?? parseModeId(route.params.get('mode'));
            if (this.pendingMode || route.params.get('mode')) {
              this.navigate(buildRoute('match', { mode: nextMode }));
            } else {
              this.navigate(buildRoute('home'));
            }
          },
        }),
      );
      return;
    }

    if (route.name === 'match') {
      const mode = parseModeId(route.params.get('mode'));
      const { MatchController } = await import('../game/MatchController');
      const controller = new MatchController({
        modeId: mode,
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
          onRematch: () => void this.beginMode(this.lastResult?.record.mode ?? 'trial12'),
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
    this.currentScreen = screen;
    this.screenHost.append(screen.element);
  }

  private navigate(hash: string): void {
    window.location.hash = hash;
  }

  private async beginMode(mode: ModeId): Promise<void> {
    this.pendingMode = mode;
    await this.audio.resume();
    await this.triggerStory({ type: 'first_launch' });
    if (!this.snapshot.calibration?.hasCompletedFullCalibration) {
      this.navigate(buildRoute('calibration', { flow: 'full', mode }));
      return;
    }
    this.navigate(buildRoute('calibration', { flow: 'quick', mode }));
  }

  private async handleMatchComplete(summary: MatchSummary): Promise<void> {
    this.lastResult = summary;
    this.snapshot = {
      ...this.snapshot,
      records: [...this.snapshot.records, summary.record],
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
    this.pendingMode = null;
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

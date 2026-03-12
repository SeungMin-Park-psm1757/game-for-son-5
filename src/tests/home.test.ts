import { describe, expect, it, vi } from 'vitest';
import { createHomeHallOfFame } from '../ui/HomeHallOfFame';

describe('home screen interactions', () => {
  it('wires start, hall, and settings actions', () => {
    const onStartMode = vi.fn();
    const onSettings = vi.fn();
    const onResetHoldComplete = vi.fn();

    const screen = createHomeHallOfFame({
      records: [],
      settings: {
        profileName: '테스트 가족',
        preferredInput: 'auto',
        reduceMotion: false,
        audioEnabled: true,
        hapticsEnabled: true,
        debugOverlay: false,
        dominantHand: 'right',
      },
      unlockedModes: ['practice6', 'chapterKorea9'],
      homeComment: {
        speaker: '엄마',
        portraitKey: 'char_mom',
        text: '천천히 가도 괜찮아.',
      },
      onStartMode,
      onSettings,
      onResetHoldComplete,
    });

    document.body.append(screen.element);

    const dockButtons = [...screen.element.querySelectorAll<HTMLButtonElement>('.home-menu-dock button')];
    const hallModal = screen.element.querySelector<HTMLElement>('.hall-modal-scrim');
    const hallCloseButton = screen.element.querySelector<HTMLButtonElement>('.hall-close-button');
    const startSheet = screen.element.querySelector<HTMLElement>('.start-sheet-scrim');

    dockButtons[0].click();
    expect(startSheet?.hidden).toBe(false);

    const practiceButton = screen.element.querySelector<HTMLButtonElement>('.start-mode-card');
    practiceButton?.click();

    dockButtons[1].click();
    dockButtons[2].click();

    expect(onStartMode).toHaveBeenCalledWith('practice6');
    expect(onSettings).toHaveBeenCalledTimes(1);
    expect(hallModal?.hidden).toBe(false);

    hallCloseButton?.click();
    expect(hallModal?.hidden).toBe(true);
  });
});

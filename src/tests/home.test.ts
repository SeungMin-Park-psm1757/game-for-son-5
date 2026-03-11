import { describe, expect, it, vi } from 'vitest';
import { createHomeHallOfFame } from '../ui/HomeHallOfFame';

describe('home screen interactions', () => {
  it('wires practice, challenge, settings, and hall buttons', () => {
    const onPractice = vi.fn();
    const onChallenge = vi.fn();
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
      homeComment: {
        speaker: '엄마',
        portraitKey: 'char_mom',
        text: '천천히 해도 괜찮아.',
      },
      ranking72Unlocked: false,
      onPractice,
      onChallenge,
      onSettings,
      onResetHoldComplete,
    });

    document.body.append(screen.element);

    const actionButtons = [...screen.element.querySelectorAll<HTMLButtonElement>('.home-action-row button')];
    const settingsButton = screen.element.querySelector<HTMLButtonElement>('.home-topbar .topbar-icon-button');
    const hallModal = screen.element.querySelector<HTMLElement>('.hall-modal-scrim');

    actionButtons[0].click();
    actionButtons[1].click();
    actionButtons[2].click();
    settingsButton?.click();

    expect(onChallenge).toHaveBeenCalledTimes(1);
    expect(onPractice).toHaveBeenCalledTimes(1);
    expect(onSettings).toHaveBeenCalledTimes(1);
    expect(hallModal?.hidden).toBe(false);
  });
});

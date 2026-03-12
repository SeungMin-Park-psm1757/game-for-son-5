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
      supportSession: [
        { speaker: '아빠', portraitKey: 'char_dad', text: '한 발씩 차분하게 가보자.' },
        { speaker: '엄마', portraitKey: 'char_mom', text: '호흡부터 맞추면 괜찮아.' },
        { speaker: '세연', portraitKey: 'char_seyeon', text: '오늘은 내가 제일 크게 응원할게!' },
      ],
      onStartMode,
      onSettings,
      onResetHoldComplete,
    });

    document.body.append(screen.element);

    const dockButtons = [...screen.element.querySelectorAll<HTMLButtonElement>('.home-menu-dock button')];
    const hallModal = screen.element.querySelector<HTMLElement>('.hall-modal-scrim');
    const hallCloseButton = screen.element.querySelector<HTMLButtonElement>('.hall-close-button');
    const startSheet = screen.element.querySelector<HTMLElement>('.start-sheet-scrim');
    const supportButtons = [...screen.element.querySelectorAll<HTMLButtonElement>('.family-support-card')];

    expect(screen.element.textContent).toContain('정우의 국궁 올림픽');
    supportButtons[1].click();
    expect(screen.element.textContent).toContain('호흡부터 맞추면 괜찮아.');

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

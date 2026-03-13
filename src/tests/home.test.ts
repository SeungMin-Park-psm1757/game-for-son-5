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
        { speaker: '아빠', portraitKey: 'char_dad', text: '첫 발부터 차분하게 가보자.' },
        { speaker: '엄마', portraitKey: 'char_mom', text: '호흡부터 맞추면 괜찮아.' },
        { speaker: '세연', portraitKey: 'char_seyeon', text: '오늘도 제일 크게 응원할게!' },
      ],
      dailyGoals: [
        { id: 'play-one-match', icon: '🏹', title: '오늘 경기 1회', target: 1, progress: 0, completed: false, detail: '0/1 경기' },
        { id: 'score-50', icon: '🥇', title: '한 경기 50점', target: 50, progress: 22, completed: false, detail: '22/50 점' },
        { id: 'hit-one-x', icon: '✨', title: 'X링 1회', target: 1, progress: 1, completed: true, detail: '1/1 X' },
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

    expect(screen.element.textContent?.replace(/\s+/g, '')).toContain('정우의국궁올림픽');
    expect(screen.element.getAttribute('data-panel-open')).toBe('false');

    supportButtons[1].click();
    expect(screen.element.textContent).toContain('호흡부터 맞추면 괜찮아.');

    dockButtons[0].click();
    expect(startSheet?.hidden).toBe(false);
    expect(screen.element.getAttribute('data-panel-open')).toBe('true');

    const practiceButton = screen.element.querySelector<HTMLButtonElement>('.start-mode-card');
    practiceButton?.click();

    dockButtons[1].click();
    dockButtons[2].click();

    expect(onStartMode).toHaveBeenCalledWith('practice6');
    expect(onSettings).toHaveBeenCalledTimes(1);
    expect(hallModal?.hidden).toBe(false);
    expect(screen.element.getAttribute('data-panel-open')).toBe('true');

    hallCloseButton?.click();
    expect(hallModal?.hidden).toBe(true);
    expect(screen.element.getAttribute('data-panel-open')).toBe('false');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { MatchHUD, type MatchHudState } from '../ui/MatchHUD';

describe('match hud', () => {
  it('renders a centered score flash with totals and tone', () => {
    const hud = new MatchHUD({
      onPauseToggle: vi.fn(),
      onRecenter: vi.fn(),
      onQuit: vi.fn(),
    });

    const state: MatchHudState = {
      modeLabel: 'Test Match',
      arrowIndex: 2,
      arrowCount: 9,
      totalScore: 28,
      rivalName: 'Siwoo',
      rivalScore: 27,
      xCount: 1,
      windLabel: 'calm',
      levelLabel: 'Lv.3',
      paused: false,
      debugEnabled: false,
      snapshot: {
        source: 'touch',
        rawYaw: 0,
        rawPitch: 0,
        yaw: 0,
        pitch: 0,
        smoothedYaw: 0,
        smoothedPitch: 0,
        stability: 1,
      },
      tension: 0.42,
      releaseTiming: 0.88,
      drawing: false,
      turnLabel: 'Player turn',
      impactBriefing: null,
      scoreFlash: {
        owner: 'player',
        label: 'Jeongwoo',
        scoreText: '10',
        totalsText: 'Me 28 : Siwoo 27',
        tone: 'perfect',
        isShowy: true,
      },
    };

    hud.update(state);
    document.body.append(hud.element);

    const flash = hud.element.querySelector<HTMLElement>('.score-flash');
    expect(flash).not.toBeNull();
    expect(flash?.hidden).toBe(false);
    expect(flash?.dataset.tone).toBe('perfect');
    expect(flash?.dataset.owner).toBe('player');
    expect(flash?.textContent).toContain('10');
    expect(flash?.textContent).toContain('28');
  });
});

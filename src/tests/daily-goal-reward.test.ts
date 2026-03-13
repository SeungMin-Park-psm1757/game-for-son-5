import { describe, expect, it, vi } from 'vitest';
import { showDailyGoalRewardOverlay } from '../ui/DailyGoalRewardOverlay';

describe('daily goal reward overlay', () => {
  it('renders reward goals and dismisses on click', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.append(host);

    const promise = showDailyGoalRewardOverlay(host, {
      goalTitles: ['오늘 경기 1회', '라이벌 1승'],
    });

    expect(host.querySelector('.daily-reward-card')).not.toBeNull();
    expect(host.textContent).toContain('오늘 목표 달성');
    expect(host.textContent).toContain('라이벌 1승');

    const scrim = host.querySelector<HTMLElement>('.daily-reward-scrim');
    scrim?.click();
    await vi.runAllTimersAsync();
    await promise;
    expect(host.querySelector('.daily-reward-scrim')).toBeNull();
    vi.useRealTimers();
  });
});

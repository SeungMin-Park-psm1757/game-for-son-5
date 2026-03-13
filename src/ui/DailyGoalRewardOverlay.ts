import { element } from './dom';

interface DailyGoalRewardOverlayOptions {
  goalTitles: string[];
}

function buildRewardLabels(goalCount: number): string[] {
  if (goalCount >= 3) {
    return [`응원 배지 +${goalCount}`, '집중 리본 강화', '오늘의 반짝 컷인'];
  }

  if (goalCount === 2) {
    return ['응원 배지 +2', '집중 리본 강화'];
  }

  return ['응원 배지 +1', '작은 축하 불꽃'];
}

export async function showDailyGoalRewardOverlay(host: HTMLElement, options: DailyGoalRewardOverlayOptions): Promise<void> {
  if (options.goalTitles.length === 0) {
    return;
  }

  const scrim = element('div', 'daily-reward-scrim');
  const card = element('div', 'daily-reward-card');
  const rewards = buildRewardLabels(options.goalTitles.length);
  const goalMarkup = options.goalTitles.map((title) => `<span class="daily-reward-goal">${title}</span>`).join('');
  const rewardMarkup = rewards.map((label) => `<span class="daily-reward-badge">${label}</span>`).join('');
  card.innerHTML = `
    <div class="daily-reward-burst"></div>
    <span class="eyebrow">Daily Reward</span>
    <strong class="daily-reward-title">오늘 목표 달성!</strong>
    <p class="daily-reward-copy">가족 응원 보상이 도착했어요. 지금 흐름 그대로 이어가보세요.</p>
    <div class="daily-reward-goals">${goalMarkup}</div>
    <div class="daily-reward-badges">${rewardMarkup}</div>
  `;
  scrim.append(card);
  host.append(scrim);

  await new Promise<void>((resolve) => {
    const finish = () => {
      scrim.remove();
      resolve();
    };

    const timeout = window.setTimeout(finish, 1650);
    scrim.addEventListener('click', () => {
      window.clearTimeout(timeout);
      finish();
    });
  });
}

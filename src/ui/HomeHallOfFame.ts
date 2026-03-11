import { getModeConfig } from '../data/modes';
import { getRecentRecords, getTopScoreRecords, getTopXRecords, sortByScore } from '../data/records';
import { PORTRAITS } from '../data/portraits';
import type { AppSettings, CalibrationProfile, MatchRecord } from '../types';
import { element, formatDate, formatPercent, type ScreenController } from './dom';

interface HomeOptions {
  records: MatchRecord[];
  calibration: CalibrationProfile | null;
  settings: AppSettings;
  homeComment: {
    speaker: string;
    portraitKey: keyof typeof PORTRAITS;
    text: string;
  };
  ranking72Unlocked: boolean;
  onPractice: () => void;
  onChallenge: () => void;
  onSync: () => void;
  onSettings: () => void;
  onResetHoldComplete: () => void;
}

export function createHomeHallOfFame(options: HomeOptions): ScreenController {
  const screen = element('section', 'screen home-screen');
  const hero = element('div', 'hero-shell');
  const titleBlock = element('div', 'hero-title-block');
  const eyebrow = element('div', 'eyebrow', '명예의 전당');
  const title = element('h1', 'hero-title', 'Family Archery 3D');
  const subtitle = element('p', 'hero-subtitle', '가족이 함께 밀어주는 국가대표 도전기');
  const chips = element('div', 'hero-chip-row');
  const profileChip = element('span', 'info-chip');
  profileChip.textContent = options.settings.profileName;
  const statusChip = element('span', 'info-chip');
  statusChip.textContent = getCalibrationStatus(options.calibration);
  const rankingChip = element('span', 'info-chip');
  rankingChip.textContent = options.ranking72Unlocked ? '72발 구조 준비 완료' : '72발 라운드 잠금';
  chips.append(profileChip, statusChip, rankingChip);
  titleBlock.append(eyebrow, title, subtitle, chips);

  const comment = element('div', 'family-comment');
  comment.style.setProperty('--comment-accent', PORTRAITS[options.homeComment.portraitKey].accent);
  comment.innerHTML = `<strong>${options.homeComment.speaker}</strong><span>${options.homeComment.text}</span>`;
  titleBlock.append(comment);

  const ctaCard = element('div', 'panel cta-panel');
  const ctaTitle = element('h2', 'section-title', '오늘의 경기');
  const ctaActions = element('div', 'stacked-actions');
  const practiceButton = element('button', 'primary-button', '연습 모드');
  const challengeButton = element('button', 'primary-button accent-button', '올림픽 챌린지 시작');
  const syncButton = element('button', 'secondary-button', '싱크 다시 맞추기');
  const settingsButton = element('button', 'secondary-button', '설정');
  practiceButton.addEventListener('click', options.onPractice);
  challengeButton.addEventListener('click', options.onChallenge);
  syncButton.addEventListener('click', options.onSync);
  settingsButton.addEventListener('click', options.onSettings);
  ctaActions.append(challengeButton, practiceButton, syncButton, settingsButton);
  ctaCard.append(ctaTitle, ctaActions);
  hero.append(titleBlock, ctaCard);

  const statsGrid = element('div', 'home-grid');
  statsGrid.append(
    createLeaderboardPanel('최고 점수 Top 5', getTopScoreRecords(options.records, 5), (record) => `${record.totalScore}점 · X ${record.xCount}`),
    createLeaderboardPanel('최다 X Top 5', getTopXRecords(options.records, 5), (record) => `X ${record.xCount} · ${record.totalScore}점`),
    createRecentPanel(getRecentRecords(options.records, 5)),
    createComparisonPanel(options.records),
  );

  const resetButton = createResetButton(options.onResetHoldComplete);
  screen.append(hero, statsGrid, resetButton);

  return {
    element: screen,
    destroy: () => {
      resetButton.remove();
    },
  };
}

function createLeaderboardPanel(titleText: string, records: MatchRecord[], label: (record: MatchRecord) => string): HTMLElement {
  const panel = element('div', 'panel leaderboard-panel');
  const title = element('h2', 'section-title', titleText);
  const list = element('ol', 'leaderboard-list');

  if (records.length === 0) {
    const empty = element('p', 'muted-text', '아직 기록이 없습니다. 첫 경기로 명예의 전당을 열어보세요.');
    panel.append(title, empty);
    return panel;
  }

  records.forEach((record, index) => {
    const item = element('li', 'leaderboard-item');
    item.innerHTML = `<span>#${index + 1}</span><span>${getModeConfig(record.mode).title}</span><strong>${label(record)}</strong>`;
    list.append(item);
  });

  panel.append(title, list);
  return panel;
}

function createRecentPanel(records: MatchRecord[]): HTMLElement {
  const panel = element('div', 'panel');
  const title = element('h2', 'section-title', '최근 5경기');
  const list = element('div', 'recent-list');

  if (records.length === 0) {
    panel.append(title, element('p', 'muted-text', '최근 경기 기록이 아직 없습니다.'));
    return panel;
  }

  records.forEach((record) => {
    const item = element('div', 'recent-item');
    item.innerHTML = `<strong>${getModeConfig(record.mode).title}</strong><span>${record.totalScore}점 · X ${record.xCount}</span><small>${formatDate(record.timestamp)}</small>`;
    list.append(item);
  });

  panel.append(title, list);
  return panel;
}

function createComparisonPanel(records: MatchRecord[]): HTMLElement {
  const panel = element('div', 'panel');
  const title = element('h2', 'section-title', '개인 최고 vs 최근');
  const sorted = sortByScore(records);
  const best = sorted[0];
  const recent = getRecentRecords(records, 1)[0];

  if (!best || !recent) {
    panel.append(title, element('p', 'muted-text', '첫 경기를 마치면 비교 카드가 열립니다.'));
    return panel;
  }

  const grid = element('div', 'comparison-grid');
  const bestCard = element('div', 'comparison-card');
  bestCard.innerHTML = `<span>PB</span><strong>${best.totalScore}점</strong><small>X ${best.xCount} · 안정도 ${formatPercent(best.averageStability)}</small>`;
  const recentCard = element('div', 'comparison-card');
  recentCard.innerHTML = `<span>최근</span><strong>${recent.totalScore}점</strong><small>X ${recent.xCount} · 릴리스 ${formatPercent(recent.averageReleaseQuality)}</small>`;
  grid.append(bestCard, recentCard);
  panel.append(title, grid);
  return panel;
}

function getCalibrationStatus(calibration: CalibrationProfile | null): string {
  if (!calibration) {
    return '싱크 필요';
  }
  if (calibration.inputMode === 'sensor') {
    return '센서 준비됨';
  }
  if (calibration.inputMode === 'touch') {
    return '터치 조준 모드';
  }
  return '데스크톱 조준 모드';
}

function createResetButton(onHoldComplete: () => void): HTMLButtonElement {
  const button = element('button', 'reset-corner-button', '초기화');
  let timer = 0;
  let startedAt = 0;

  const cancel = () => {
    button.style.setProperty('--hold-progress', '0');
    if (timer) {
      window.clearInterval(timer);
      timer = 0;
    }
  };

  const begin = () => {
    startedAt = performance.now();
    timer = window.setInterval(() => {
      const progress = Math.min((performance.now() - startedAt) / 2000, 1);
      button.style.setProperty('--hold-progress', progress.toString());
      if (progress >= 1) {
        cancel();
        onHoldComplete();
      }
    }, 40);
  };

  button.addEventListener('pointerdown', begin);
  button.addEventListener('pointerup', cancel);
  button.addEventListener('pointerleave', cancel);
  button.addEventListener('pointercancel', cancel);
  return button;
}

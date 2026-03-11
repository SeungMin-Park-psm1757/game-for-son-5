import { getModeConfig } from '../data/modes';
import { PORTRAITS, type PortraitKey } from '../data/portraits';
import { getRecentRecords, getTopScoreRecords, getTopXRecords, sortByScore } from '../data/records';
import type { AppSettings, MatchRecord } from '../types';
import { element, formatDate, formatPercent, type ScreenController } from './dom';

interface HomeOptions {
  records: MatchRecord[];
  settings: AppSettings;
  homeComment: {
    speaker: string;
    portraitKey: keyof typeof PORTRAITS;
    text: string;
  };
  ranking72Unlocked: boolean;
  onPractice: () => void;
  onChallenge: () => void;
  onSettings: () => void;
  onResetHoldComplete: () => void;
}

export function createHomeHallOfFame(options: HomeOptions): ScreenController {
  const screen = element('section', 'screen home-screen');
  const shell = element('div', 'home-shell');
  const topbar = createTopbar(options);
  const hero = createHero(options);
  const hallModal = createHallModal(options.records);
  const resetButton = createResetButton(options.onResetHoldComplete);

  hero.hallButton.addEventListener('click', hallModal.open);
  shell.append(topbar, hero.element, createCoachNote());
  screen.append(shell, hallModal.element, resetButton);

  return {
    element: screen,
    destroy: () => {
      resetButton.remove();
    },
  };
}

function createTopbar(options: HomeOptions): HTMLElement {
  const topbar = element('header', 'home-topbar');
  const brand = element('div', 'home-brand');
  const brandKicker = element('span', 'home-brand-kicker', 'Family Archery 3D');
  const brandName = element('strong', 'home-brand-name', '가족이 응원하는 국궁 챌린지');
  brand.append(brandKicker, brandName);

  const meta = element('div', 'home-topbar-meta');
  const profile = element('span', 'topbar-pill', options.settings.profileName);
  const ready = element('span', 'topbar-pill');
  ready.textContent = options.ranking72Unlocked ? '랭킹 라운드 준비 완료' : '터치 조준 바로 시작';
  const settings = element('button', 'topbar-icon-button', '설정');
  settings.addEventListener('click', options.onSettings);
  meta.append(profile, ready, settings);

  topbar.append(brand, meta);
  return topbar;
}

function createHero(options: HomeOptions): { element: HTMLElement; hallButton: HTMLButtonElement } {
  const best = sortByScore(options.records)[0];
  const latest = getRecentRecords(options.records, 1)[0];
  const hero = element('section', 'home-hero-card');
  const copy = element('div', 'home-hero-copy');
  const kicker = element('span', 'hero-kicker', 'Warm-up Free Start');
  const title = element('h1', 'home-display', '손끝으로 조준하고, 흔들림이 모일 때 놓으세요');
  const lead = element(
    'p',
    'home-lead',
    '휴대폰 화면을 드래그해 과녁을 맞추고, 홀드 중 커지는 떨림이 잠깐 잠잠해지는 순간에 화살을 놓는 모바일 3D 국궁 게임입니다.',
  );

  const actions = element('div', 'home-action-row');
  const challengeButton = element('button', 'primary-button hero-button', '대표 선발전 12발');
  const practiceButton = element('button', 'secondary-button hero-button', '연습장 6발');
  const hallButton = element('button', 'secondary-button hero-button hall-button', '명예의 전당 보기');
  challengeButton.addEventListener('click', options.onChallenge);
  practiceButton.addEventListener('click', options.onPractice);
  actions.append(challengeButton, practiceButton, hallButton);

  const metrics = element('div', 'hero-metric-row');
  metrics.append(
    createMetricCard('개인 최고', best ? `${best.totalScore}점` : '기록 없음', best ? `X ${best.xCount}` : '첫 경기를 시작해보세요'),
    createMetricCard('최근 경기', latest ? `${latest.totalScore}점` : '아직 없음', latest ? formatDate(latest.timestamp) : '명예의 전당이 비어 있어요'),
    createMetricCard('누적 경기', `${options.records.length}회`, options.ranking72Unlocked ? '72발 모드 해금 가능' : '12발 모드 중심으로 손맛 확인'),
  );

  const familyRow = element('div', 'family-lineup');
  familyRow.append(
    createFamilyPill('char_dad', '아빠'),
    createFamilyPill('char_mom', '엄마'),
    createFamilyPill('char_seyeon', '세연'),
    createFamilyPill('char_jeongwoo', '정우'),
  );

  copy.append(kicker, title, lead, actions, metrics, familyRow);

  const visual = element('div', 'hero-visual-card');
  visual.append(createTargetDisplay(options.homeComment), createQuickRules());
  hero.append(copy, visual);

  return { element: hero, hallButton };
}

function createTargetDisplay(comment: HomeOptions['homeComment']): HTMLElement {
  const visual = element('div', 'hero-visual');
  const glow = element('div', 'target-glow');
  const target = element('div', 'target-rings');
  for (let ring = 0; ring < 5; ring += 1) {
    target.append(element('span', 'target-ring'));
  }
  const bullseye = element('div', 'target-bullseye');
  const arrow = element('div', 'hero-arrow');
  visual.append(glow, target, bullseye, arrow);

  const quote = element('div', 'hero-quote');
  quote.style.setProperty('--portrait-accent', PORTRAITS[comment.portraitKey].accent);
  quote.innerHTML = `<strong>${comment.speaker}</strong><p>${comment.text}</p>`;

  const badge = element('div', 'hero-mini-badge');
  badge.innerHTML = `
    <span>조준 방식</span>
    <strong>화면 드래그 + 릴리스 타이밍</strong>
    <small>싱크 없이 바로 시작</small>
  `;

  const wrap = element('div', 'hero-visual-stack');
  wrap.append(visual, quote, badge);
  return wrap;
}

function createQuickRules(): HTMLElement {
  const panel = element('div', 'hero-rules');
  panel.append(
    createRule('1', '화면 드래그', '과녁 중앙을 향해 시점을 잡습니다.'),
    createRule('2', '홀드로 당기기', '오래 당길수록 떨림과 긴장감이 커집니다.'),
    createRule('3', '정확한 순간 릴리스', '흔들림이 중앙으로 모일 때 놓으면 10점권이 열립니다.'),
  );
  return panel;
}

function createRule(step: string, title: string, text: string): HTMLElement {
  const row = element('div', 'hero-rule');
  const badge = element('span', 'hero-rule-step', step);
  const body = element('div', 'hero-rule-body');
  body.innerHTML = `<strong>${title}</strong><p>${text}</p>`;
  row.append(badge, body);
  return row;
}

function createMetricCard(label: string, value: string, detail: string): HTMLElement {
  const card = element('div', 'hero-metric-card');
  card.innerHTML = `<span>${label}</span><strong>${value}</strong><small>${detail}</small>`;
  return card;
}

function createFamilyPill(key: PortraitKey, name: string): HTMLElement {
  const pill = element('div', 'family-pill');
  pill.style.setProperty('--portrait-accent', PORTRAITS[key].accent);
  pill.style.setProperty('--portrait-soft', PORTRAITS[key].accentSoft);
  pill.innerHTML = `<span>${PORTRAITS[key].initials}</span><strong>${name}</strong>`;
  return pill;
}

function createCoachNote(): HTMLElement {
  const note = element('div', 'coach-note');
  note.innerHTML = `
    <strong>오늘의 한 줄 팁</strong>
    <span>드래그로 먼저 중앙을 만들고, 발사는 조급하게 하지 말고 떨림이 모이는 박자를 기다려보세요.</span>
  `;
  return note;
}

function createHallModal(records: MatchRecord[]): { element: HTMLElement; open: () => void } {
  const scrim = element('div', 'hall-modal-scrim');
  scrim.hidden = true;
  const card = element('div', 'hall-modal-card');
  const header = element('div', 'hall-modal-header');
  const titleBlock = element('div', 'hall-modal-title');
  titleBlock.innerHTML = `<span>Hall of Fame</span><h2>기록 세부 보기</h2>`;
  const closeButton = element('button', 'topbar-icon-button', '닫기');
  header.append(titleBlock, closeButton);

  const overview = element('div', 'hall-overview-row');
  const best = sortByScore(records)[0];
  const recent = getRecentRecords(records, 1)[0];
  overview.append(
    createOverviewCard('최고 점수', best ? `${best.totalScore}점` : '기록 없음', best ? `X ${best.xCount}` : '첫 플레이를 기다리는 중'),
    createOverviewCard('최근 경기', recent ? `${recent.totalScore}점` : '아직 없음', recent ? formatDate(recent.timestamp) : '경기를 시작하면 여기에 쌓입니다'),
    createOverviewCard('평균 안정도', records.length ? formatPercent(average(records.map((record) => record.averageStability))) : '-', records.length ? '최근까지 누적 평균' : '아직 샘플이 없어요'),
  );

  const grid = element('div', 'hall-grid');
  grid.append(
    createLeaderboardPanel('최고 점수 Top 5', getTopScoreRecords(records, 5), (record) => `${record.totalScore}점 / X ${record.xCount}`),
    createLeaderboardPanel('최다 X Top 5', getTopXRecords(records, 5), (record) => `X ${record.xCount} / ${record.totalScore}점`),
    createRecentPanel(getRecentRecords(records, 10)),
    createComparisonPanel(records),
  );

  card.append(header, overview, grid);
  scrim.append(card);

  const close = () => {
    scrim.hidden = true;
  };

  closeButton.addEventListener('click', close);
  scrim.addEventListener('click', (event) => {
    if (event.target === scrim) {
      close();
    }
  });

  return {
    element: scrim,
    open: () => {
      scrim.hidden = false;
    },
  };
}

function createOverviewCard(label: string, value: string, detail: string): HTMLElement {
  const card = element('div', 'hall-overview-card');
  card.innerHTML = `<span>${label}</span><strong>${value}</strong><small>${detail}</small>`;
  return card;
}

function createLeaderboardPanel(titleText: string, records: MatchRecord[], label: (record: MatchRecord) => string): HTMLElement {
  const panel = element('section', 'panel hall-section');
  const title = element('h3', 'section-title', titleText);

  if (records.length === 0) {
    panel.append(title, element('p', 'muted-text', '아직 비어 있어요. 첫 경기로 명예의 전당을 채워보세요.'));
    return panel;
  }

  const list = element('ol', 'leaderboard-list');
  records.forEach((record, index) => {
    const item = element('li', 'leaderboard-item');
    item.innerHTML = `
      <span>#${index + 1}</span>
      <strong>${label(record)}</strong>
      <small>${getModeConfig(record.mode).title} · ${formatDate(record.timestamp)}</small>
    `;
    list.append(item);
  });

  panel.append(title, list);
  return panel;
}

function createRecentPanel(records: MatchRecord[]): HTMLElement {
  const panel = element('section', 'panel hall-section');
  const title = element('h3', 'section-title', '최근 10경기');

  if (records.length === 0) {
    panel.append(title, element('p', 'muted-text', '아직 최근 경기 기록이 없습니다.'));
    return panel;
  }

  const list = element('div', 'recent-list');
  records.forEach((record) => {
    const item = element('article', 'recent-item');
    item.innerHTML = `
      <strong>${getModeConfig(record.mode).title}</strong>
      <span>${record.totalScore}점 · X ${record.xCount}</span>
      <small>안정도 ${formatPercent(record.averageStability)} · 릴리스 ${formatPercent(record.averageReleaseQuality)}</small>
    `;
    list.append(item);
  });

  panel.append(title, list);
  return panel;
}

function createComparisonPanel(records: MatchRecord[]): HTMLElement {
  const panel = element('section', 'panel hall-section');
  const title = element('h3', 'section-title', '개인 최고 vs 최근 경기');
  const best = sortByScore(records)[0];
  const recent = getRecentRecords(records, 1)[0];

  if (!best || !recent) {
    panel.append(title, element('p', 'muted-text', '경기를 한 번 마치면 비교 카드가 열립니다.'));
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

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

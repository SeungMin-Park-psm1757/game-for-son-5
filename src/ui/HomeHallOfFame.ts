import { CHAPTER_MODE_IDS, getModeConfig } from '../data/modes';
import { getPortraitImageUrl, PORTRAITS } from '../data/portraits';
import type { HomeSupportPortraitKey, HomeSupportSelection } from '../data/homeSupport';
import { getRecentRecords, getTopScoreRecords, getTopXRecords, sortByScore } from '../data/records';
import { getPlayerProgress } from '../game/playerProgress';
import type { AppSettings, MatchRecord, ModeId } from '../types';
import { element, formatDate, formatPercent, type ScreenController } from './dom';

interface HomeOptions {
  records: MatchRecord[];
  settings: AppSettings;
  unlockedModes: ModeId[];
  supportSession: HomeSupportSelection[];
  onStartMode: (mode: ModeId) => void;
  onSettings: () => void;
  onResetHoldComplete: () => void;
}

export function createHomeHallOfFame(options: HomeOptions): ScreenController {
  const screen = element('section', 'screen home-screen home-stage-screen');
  const setPanelOpen = (isOpen: boolean) => {
    screen.dataset.panelOpen = isOpen ? 'true' : 'false';
  };
  setPanelOpen(false);

  const stage = createStage(options);
  const startSheet = createStartSheet(options, setPanelOpen);
  const hallModal = createHallModal(options.records, setPanelOpen);
  const resetButton = createResetButton(options.onResetHoldComplete);

  stage.startButton.addEventListener('click', startSheet.open);
  stage.hallButton.addEventListener('click', hallModal.open);
  stage.settingsButton.addEventListener('click', options.onSettings);

  screen.append(stage.element, startSheet.element, hallModal.element, resetButton);

  return {
    element: screen,
    destroy: () => {
      setPanelOpen(false);
      resetButton.remove();
    },
  };
}

function createStage(options: HomeOptions): {
  element: HTMLElement;
  startButton: HTMLButtonElement;
  hallButton: HTMLButtonElement;
  settingsButton: HTMLButtonElement;
} {
  const shell = element('div', 'home-stage-shell');
  const atmosphere = element('div', 'home-stage-atmosphere');
  atmosphere.innerHTML = `
    <div class="home-stage-sun"></div>
    <div class="home-stage-cloud home-stage-cloud-left"><span></span><span></span><span></span></div>
    <div class="home-stage-cloud home-stage-cloud-mid"><span></span><span></span><span></span></div>
    <div class="home-stage-cloud home-stage-cloud-right"><span></span><span></span><span></span></div>
    <div class="home-stage-mountain home-stage-mountain-back"></div>
    <div class="home-stage-mountain home-stage-mountain-front"></div>
    <div class="home-stage-pavilion home-stage-pavilion-left"></div>
    <div class="home-stage-pavilion home-stage-pavilion-right"></div>
    <div class="home-stage-lane-rail home-stage-lane-rail-left"></div>
    <div class="home-stage-lane-rail home-stage-lane-rail-right"></div>
    <div class="home-stage-haze"></div>
    <div class="home-stage-target"></div>
    <div class="home-stage-target-shadow"></div>
    <div class="home-stage-archer"></div>
    <div class="home-stage-bow"></div>
    <div class="home-stage-arrow"></div>
    <div class="home-stage-flag home-stage-flag-left"></div>
    <div class="home-stage-flag home-stage-flag-right"></div>
    <div class="home-stage-streamer home-stage-streamer-left"></div>
    <div class="home-stage-streamer home-stage-streamer-right"></div>
  `;

  const header = element('div', 'home-stage-header');
  header.innerHTML = '<h1 class="home-stage-title">정우의 국궁 올림픽</h1>';

  const main = element('div', 'home-stage-main');
  main.append(createSupportPanel(options.supportSession), createStatusRibbon(options.records));

  const dock = element('nav', 'home-menu-dock');
  const startButton = element('button', 'primary-button dock-button', '게임 시작');
  const hallButton = element('button', 'secondary-button dock-button', '명예의 전당');
  const settingsButton = element('button', 'secondary-button dock-button', '설정');
  dock.append(startButton, hallButton, settingsButton);

  const deck = element('div', 'home-stage-deck');
  deck.append(main, dock);

  shell.append(atmosphere, header, deck);
  return { element: shell, startButton, hallButton, settingsButton };
}

function createSupportPanel(session: HomeSupportSelection[]): HTMLElement {
  const panel = element('div', 'home-support-panel');
  const messageCard = element('div', 'home-stage-comment');
  const castGrid = element('div', 'family-support-grid');
  const safeSession: HomeSupportSelection[] =
    session.length > 0 ? session : [{ portraitKey: 'char_mom', speaker: '엄마', text: '천천히 호흡부터 맞춰보자.' }];
  const castButtons: HTMLButtonElement[] = [];
  let activeKey: HomeSupportPortraitKey = safeSession[0].portraitKey;

  const renderMessage = (selection: HomeSupportSelection) => {
    const info = PORTRAITS[selection.portraitKey];
    messageCard.style.setProperty('--portrait-accent', info.accent);
    messageCard.style.setProperty('--portrait-soft', info.accentSoft);
    messageCard.innerHTML = `
      <div>
        <span class="home-stage-message-tag">${selection.speaker} 응원</span>
        <p>${selection.text}</p>
      </div>
    `;

    castButtons.forEach((button) => {
      button.dataset.active = button.dataset.key === selection.portraitKey ? 'true' : 'false';
    });
  };

  safeSession.forEach((selection) => {
    const info = PORTRAITS[selection.portraitKey];
    const button = element('button', 'family-support-card');
    button.dataset.key = selection.portraitKey;
    button.style.setProperty('--portrait-accent', info.accent);
    button.style.setProperty('--portrait-soft', info.accentSoft);
    button.innerHTML = `
      <span class="family-support-photo-wrap">
        <img class="family-support-photo" src="${getPortraitImageUrl(selection.portraitKey)}" alt="${info.label}" />
      </span>
      <strong>${info.label}</strong>
    `;
    button.addEventListener('click', () => {
      activeKey = selection.portraitKey;
      renderMessage(selection);
    });
    castButtons.push(button);
    castGrid.append(button);
  });

  const initial = safeSession.find((entry) => entry.portraitKey === activeKey) ?? safeSession[0];
  renderMessage(initial);

  panel.append(messageCard, castGrid);
  return panel;
}

function createStatusRibbon(records: MatchRecord[]): HTMLElement {
  const ribbon = element('div', 'home-stage-ribbon');
  const best = sortByScore(records)[0];
  const latest = getRecentRecords(records, 1)[0];
  const progress = getPlayerProgress(records);

  ribbon.innerHTML = `
    <span>🏅 Lv.${progress.level} ${progress.levelLabel}</span>
    <span>🏹 최고 ${best ? `${getModeConfig(best.mode).locationLabel} ${best.totalScore}점` : '기록 없음'}</span>
    <span>✨ 최근 ${latest ? `${getModeConfig(latest.mode).locationLabel} ${latest.totalScore}점` : '아직 없음'}</span>
  `;

  return ribbon;
}

function createStartSheet(options: HomeOptions, setPanelOpen: (isOpen: boolean) => void): { element: HTMLElement; open: () => void } {
  const scrim = element('div', 'modal-scrim start-sheet-scrim');
  scrim.hidden = true;
  const sheet = element('div', 'start-sheet-card');
  const header = element('div', 'start-sheet-header');
  header.innerHTML = `
    <div>
      <span class="eyebrow">Game Start</span>
      <h2 class="section-title">모드를 선택하세요</h2>
    </div>
  `;
  const closeButton = element('button', 'topbar-icon-button', '닫기');
  header.append(closeButton);

  const close = () => {
    scrim.hidden = true;
    setPanelOpen(false);
  };

  const list = element('div', 'start-sheet-list');
  list.append(
    createModeCard('practice6', options, getModeHelperText('practice6', options.unlockedModes), close),
    ...CHAPTER_MODE_IDS.map((modeId) =>
      createModeCard(modeId, options, getModeHelperText(modeId, options.unlockedModes), close),
    ),
  );

  sheet.append(header, list);
  scrim.append(sheet);

  closeButton.addEventListener('click', close);
  scrim.addEventListener('click', (event) => {
    if (event.target === scrim) {
      close();
    }
  });

  return {
    element: scrim,
    open: () => {
      setPanelOpen(true);
      scrim.hidden = false;
    },
  };
}

function createModeCard(modeId: ModeId, options: HomeOptions, helperText: string, onStart: () => void): HTMLElement {
  const mode = getModeConfig(modeId);
  const card = element('button', 'start-mode-card');
  const unlocked = !mode.isChallenge || options.unlockedModes.includes(modeId);
  card.disabled = !unlocked;
  card.innerHTML = `
    <span class="start-mode-emoji">${mode.badgeEmoji}</span>
    <div class="start-mode-copy">
      <strong>${mode.title}</strong>
      <small>${mode.subtitle}</small>
      <p>${helperText}</p>
    </div>
    <span class="start-mode-arrow">${unlocked ? '시작' : '잠김'}</span>
  `;

  card.addEventListener('click', () => {
    if (unlocked) {
      onStart();
      options.onStartMode(modeId);
    }
  });

  return card;
}

function getModeHelperText(modeId: ModeId, unlockedModes: ModeId[]): string {
  const mode = getModeConfig(modeId);
  if (modeId === 'practice6') {
    return '바람 약함 · 감각 확인';
  }
  if (!unlockedModes.includes(modeId)) {
    return modeId === 'chapterJapan9' ? '해금 조건 · 한국 66점' : '해금 조건 · 일본 72점';
  }
  return mode.description;
}

function createHallModal(records: MatchRecord[], setPanelOpen: (isOpen: boolean) => void): { element: HTMLElement; open: () => void } {
  const scrim = element('div', 'hall-modal-scrim');
  scrim.hidden = true;
  const card = element('div', 'hall-modal-card');
  const header = element('div', 'hall-modal-header');
  const titleBlock = element('div', 'hall-modal-title');
  titleBlock.innerHTML = '<span>Hall of Fame</span><h2>명예의 전당</h2>';
  const closeButton = element('button', 'topbar-icon-button hall-close-button', '닫기');
  header.append(titleBlock, closeButton);

  const overview = element('div', 'hall-overview-row');
  const best = sortByScore(records)[0];
  const recent = getRecentRecords(records, 1)[0];
  overview.append(
    createOverviewCard('개인 최고', best ? `${getModeConfig(best.mode).locationLabel} ${best.totalScore}점` : '기록 없음', best ? `X ${best.xCount}` : '첫 경기를 기다리고 있어요'),
    createOverviewCard('최근 경기', recent ? `${getModeConfig(recent.mode).locationLabel} ${recent.totalScore}점` : '아직 없음', recent ? formatDate(recent.timestamp) : '첫 경기가 저장되면 여기에 나타납니다'),
    createOverviewCard('평균 안정도', records.length ? formatPercent(average(records.map((record) => record.averageStability))) : '-', records.length ? '전체 경기 평균' : '아직 데이터가 없어요'),
  );

  const grid = element('div', 'hall-grid');
  grid.append(
    createLeaderboardPanel('최고 점수 Top 5', getTopScoreRecords(records, 5), (record) => `${record.totalScore}점`),
    createLeaderboardPanel('최다 X Top 5', getTopXRecords(records, 5), (record) => `X ${record.xCount}`),
    createRecentPanel(getRecentRecords(records, 10)),
    createComparisonPanel(records),
  );

  card.append(header, overview, grid);
  scrim.append(card);

  const close = () => {
    scrim.hidden = true;
    setPanelOpen(false);
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
      setPanelOpen(true);
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
    panel.append(title, element('p', 'muted-text', '첫 경기 기록이 들어오면 여기부터 차곡차곡 채워집니다.'));
    return panel;
  }

  const list = element('ol', 'leaderboard-list');
  records.forEach((record, index) => {
    const mode = getModeConfig(record.mode);
    const item = element('li', 'leaderboard-item');
    item.innerHTML = `
      <span>#${index + 1}</span>
      <strong>${mode.badgeEmoji} ${mode.locationLabel} · ${label(record)}</strong>
      <small>${mode.shortTitle} · ${formatDate(record.timestamp)}</small>
    `;
    list.append(item);
  });

  panel.append(title, list);
  return panel;
}

function createRecentPanel(records: MatchRecord[]): HTMLElement {
  const panel = element('section', 'panel hall-section');
  const title = element('h3', 'section-title', '최근 경기');

  if (records.length === 0) {
    panel.append(title, element('p', 'muted-text', '최근 경기 기록이 아직 없습니다.'));
    return panel;
  }

  const list = element('div', 'recent-list');
  records.forEach((record) => {
    const mode = getModeConfig(record.mode);
    const item = element('article', 'recent-item');
    item.innerHTML = `
      <strong>${mode.badgeEmoji} ${mode.title}</strong>
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
    panel.append(title, element('p', 'muted-text', '두 경기 이상 쌓이면 비교 카드가 열립니다.'));
    return panel;
  }

  const grid = element('div', 'comparison-grid');
  const bestCard = element('div', 'comparison-card');
  bestCard.innerHTML = `<span>PB</span><strong>${getModeConfig(best.mode).locationLabel} ${best.totalScore}점</strong><small>X ${best.xCount} · 안정도 ${formatPercent(best.averageStability)}</small>`;
  const recentCard = element('div', 'comparison-card');
  recentCard.innerHTML = `<span>최근</span><strong>${getModeConfig(recent.mode).locationLabel} ${recent.totalScore}점</strong><small>X ${recent.xCount} · 릴리스 ${formatPercent(recent.averageReleaseQuality)}</small>`;
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

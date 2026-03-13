import { getPortraitImageUrl, PORTRAITS } from '../data/portraits';
import { getRivalResultCutin } from '../data/rival';
import { getModeConfig } from '../data/modes';
import type { MatchSummary } from '../game/types';
import { element, formatDate, formatPercent, type ScreenController } from './dom';

interface ResultScreenOptions {
  summary: MatchSummary;
  onHome: () => void;
  onRematch: () => void;
}

export function createResultScreen(options: ResultScreenOptions): ScreenController {
  const { summary } = options;
  const mode = getModeConfig(summary.record.mode);
  const screen = element('section', 'screen result-screen');
  const hero = element('div', 'panel result-hero');
  hero.innerHTML = `
    <span class="eyebrow">경기 결과</span>
    <h1 class="hero-title">${mode.badgeEmoji} ${mode.title}</h1>
    <p class="hero-subtitle">${summary.record.totalScore}점 · X ${summary.record.xCount} · ${formatDate(summary.record.timestamp)}</p>
  `;

  const band = element('div', 'result-band');
  band.dataset.band = summary.resultBand;
  band.textContent =
    summary.resultBand === 'gold'
      ? '금빛 엔딩'
      : summary.resultBand === 'silver'
        ? '은빛 엔딩'
        : summary.resultBand === 'bronze'
          ? '동빛 엔딩'
          : '격려 엔딩';

  const rivalCutin = summary.rivalId ? createRivalResultCutin(summary) : null;

  const stats = element('div', 'home-grid');
  const overview = element('div', 'panel');
  const rivalSummary = summary.rivalName
    ? `<div class="comparison-card"><span>라이벌</span><strong>${summary.rivalName} ${summary.rivalTotalScore}점</strong><small>${summary.didBeatRival ? '정우 승리' : '라이벌 우세'}</small></div>`
    : '';
  overview.innerHTML = `
    <h2 class="section-title">요약</h2>
    <div class="comparison-grid">
      <div class="comparison-card"><span>챕터</span><strong>${mode.locationLabel}</strong></div>
      ${rivalSummary}
      <div class="comparison-card"><span>안정도</span><strong>${formatPercent(summary.record.averageStability)}</strong></div>
      <div class="comparison-card"><span>릴리스</span><strong>${formatPercent(summary.record.averageReleaseQuality)}</strong></div>
      <div class="comparison-card"><span>명예의 전당</span><strong>#${summary.hallOfFameRank}</strong></div>
    </div>
  `;

  const arrows = element('div', 'panel');
  const title = element('h2', 'section-title', '화살별 점수');
  const strip = element('div', 'arrow-strip');
  summary.record.arrowScores.forEach((score, index) => {
    const chip = element('span', 'arrow-chip', `${index + 1}발 · ${score}`);
    if (score === 10) {
      chip.classList.add('is-bullseye');
    }
    strip.append(chip);
  });
  arrows.append(title, strip);

  const status = element('div', 'panel');
  status.innerHTML = `
    <h2 class="section-title">기록 반영</h2>
    <p>${summary.isPersonalBest ? '개인 최고 기록이 갱신되었습니다.' : '이번 기록도 명예의 전당에 저장되었습니다.'}</p>
    <p>${summary.rivalName ? `${summary.rivalName}과의 대결 ${summary.didBeatRival ? '승리' : '재도전'}입니다.` : '이번 경기는 개인 기록전으로 저장되었습니다.'}</p>
    <p>${summary.unlockedMode ? `${getModeConfig(summary.unlockedMode).title}가 새로 열렸습니다.` : '다음 경기에서 더 높은 기록에 도전해보세요.'}</p>
    <p>바람 요약 · ${summary.record.windSummary}</p>
  `;

  stats.append(overview, arrows, status);
  const actions = element('div', 'action-row');
  const rematch = element('button', 'primary-button', '다시 경기');
  const home = element('button', 'secondary-button', '홈으로');
  rematch.addEventListener('click', options.onRematch);
  home.addEventListener('click', options.onHome);
  actions.append(rematch, home);

  if (rivalCutin) {
    screen.append(hero, band, rivalCutin, stats, actions);
  } else {
    screen.append(hero, band, stats, actions);
  }
  return { element: screen };
}

function createRivalResultCutin(summary: MatchSummary): HTMLElement | null {
  if (!summary.rivalId) {
    return null;
  }

  const cutin = getRivalResultCutin(summary.rivalId, summary.didBeatRival, summary.record.timestamp);
  const portraitInfo = PORTRAITS[cutin.profile.portraitKey];
  const portraitClass = portraitInfo.renderMode === 'pixel' ? 'is-pixel' : '';
  const card = element('section', 'panel rival-result-cutin');
  card.dataset.tone = cutin.tone;
  card.style.setProperty('--rival-accent', cutin.profile.accent);
  card.style.setProperty('--rival-soft', cutin.profile.accentSoft);
  card.innerHTML = `
    <div class="rival-result-photo">
      <img class="${portraitClass}" src="${getPortraitImageUrl(cutin.profile.portraitKey)}" alt="${cutin.profile.name}" />
    </div>
    <div class="rival-result-copy">
      <span class="eyebrow">Rival Cut-in</span>
      <strong>${cutin.headline}</strong>
      <p>${cutin.body}</p>
      <small>${cutin.profile.name} · ${cutin.profile.title}</small>
    </div>
    <span class="rival-result-stamp">${cutin.stamp}</span>
  `;
  return card;
}

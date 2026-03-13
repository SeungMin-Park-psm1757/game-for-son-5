import { describe, expect, it, vi } from 'vitest';
import { createResultScreen } from '../ui/ResultScreen';
import type { MatchSummary } from '../game/types';

describe('result screen', () => {
  it('renders rival cut-in when a rival summary exists', () => {
    const summary: MatchSummary = {
      record: {
        id: 'record-1',
        mode: 'chapterKorea9',
        totalScore: 71,
        arrowScores: [8, 7, 9, 10, 8, 7, 8, 7, 7],
        xCount: 1,
        averageStability: 0.82,
        averageReleaseQuality: 0.78,
        matchDurationMs: 65000,
        windSummary: '고요',
        timestamp: 1_700_000_000_000,
        calibrationVersion: 0,
        resultBand: 'silver',
        rivalId: 'siwoo',
        rivalName: '시우',
        rivalTotalScore: 66,
        didBeatRival: true,
      },
      isPersonalBest: true,
      hallOfFameRank: 1,
      unlockedMode: null,
      resultBand: 'silver',
      rivalId: 'siwoo',
      rivalName: '시우',
      rivalTotalScore: 66,
      rivalArrowScores: [7, 7, 8, 8, 7, 7, 8, 7, 7],
      didBeatRival: true,
    };

    const screen = createResultScreen({
      summary,
      onHome: vi.fn(),
      onRematch: vi.fn(),
    });

    document.body.append(screen.element);
    expect(screen.element.querySelector('.rival-result-cutin')).not.toBeNull();
    expect(screen.element.textContent).toContain('시우');
    expect(screen.element.textContent).toContain('경기 결과');
  });
});

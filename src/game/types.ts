import type { MatchRecord, ModeId, ResultBand, RivalId } from '../types';

export interface ShotScore {
  score: number;
  isX: boolean;
  isBullseye: boolean;
  distance: number;
  hitX: number;
  hitY: number;
}

export interface ShotTelemetry {
  stability: number;
  releaseQuality: number;
  drawDuration: number;
  wind: number;
}

export interface MatchSummary {
  record: MatchRecord;
  isPersonalBest: boolean;
  hallOfFameRank: number;
  unlockedMode: ModeId | null;
  resultBand: ResultBand;
  rivalId: RivalId | null;
  rivalName: string | null;
  rivalTotalScore: number;
  rivalArrowScores: number[];
  didBeatRival: boolean | null;
}

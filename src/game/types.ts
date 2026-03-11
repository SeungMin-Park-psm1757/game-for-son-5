import type { MatchRecord, ModeId, ResultBand } from '../types';

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
}

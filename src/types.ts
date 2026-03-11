export type ModeId = 'practice6' | 'trial12' | 'ranking72';
export type InputMode = 'sensor' | 'touch' | 'desktop';
export type DominantHand = 'left' | 'right';
export type ResultBand = 'encourage' | 'bronze' | 'silver' | 'gold';
export type ResetScope = 'records' | 'calibration' | 'all';

export interface ModeConfig {
  id: ModeId;
  title: string;
  subtitle: string;
  arrowCount: number;
  ends: number;
  description: string;
  isChallenge: boolean;
  unlockScore?: number;
}

export interface CalibrationProfile {
  version: number;
  inputMode: InputMode;
  dominantHand: DominantHand;
  neutral: {
    yaw: number;
    pitch: number;
  };
  zeroOffset: {
    yaw: number;
    pitch: number;
  };
  sensitivity: {
    yaw: number;
    pitch: number;
  };
  deadzone: number;
  smoothingAlpha: number;
  jitter: number;
  hasCompletedFullCalibration: boolean;
  updatedAt: number;
}

export interface AppSettings {
  profileName: string;
  preferredInput: InputMode | 'auto';
  reduceMotion: boolean;
  audioEnabled: boolean;
  hapticsEnabled: boolean;
  debugOverlay: boolean;
  dominantHand: DominantHand;
}

export interface MatchRecord {
  id: string;
  mode: ModeId;
  totalScore: number;
  arrowScores: number[];
  xCount: number;
  averageStability: number;
  averageReleaseQuality: number;
  matchDurationMs: number;
  windSummary: string;
  timestamp: number;
  calibrationVersion: number;
  resultBand: ResultBand;
}

export interface StoryFlags {
  seenEventIds: string[];
  lastShownMatchIndex: Record<string, number>;
  totalMatchesPlayed: number;
}

export interface AppStorageSnapshot {
  records: MatchRecord[];
  calibration: CalibrationProfile | null;
  settings: AppSettings;
  unlockedModes: ModeId[];
  storyFlags: StoryFlags;
}

export type ModeId = 'practice6' | 'chapterKorea9' | 'chapterJapan9' | 'chapterUsa9';
export type ChapterId = 'practice' | 'korea' | 'japan' | 'usa';
export type InputMode = 'sensor' | 'touch' | 'desktop';
export type DominantHand = 'left' | 'right';
export type ResultBand = 'encourage' | 'bronze' | 'silver' | 'gold';
export type ResetScope = 'records' | 'calibration' | 'all';
export type RivalId = 'siwoo' | 'siyeon' | 'jihwan' | 'junhong' | 'carbot' | 'pororo' | 'loopy';

export interface ModeConfig {
  id: ModeId;
  chapterId: ChapterId;
  title: string;
  shortTitle: string;
  subtitle: string;
  arrowCount: number;
  ends: number;
  description: string;
  isChallenge: boolean;
  locationLabel: string;
  badgeEmoji: string;
  unlockScore?: number;
  nextMode?: ModeId;
  windDrift: number;
  windClamp: number;
  windInfluence: number;
  tremorMultiplier: number;
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
  rivalId?: RivalId | null;
  rivalName?: string | null;
  rivalTotalScore?: number;
  didBeatRival?: boolean | null;
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

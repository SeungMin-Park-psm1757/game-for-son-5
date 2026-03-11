import { DEFAULT_UNLOCKED_MODES } from '../data/modes';
import type { AppSettings, AppStorageSnapshot, CalibrationProfile, MatchRecord, StoryFlags } from '../types';

export const STORAGE_VERSION = 1;
export const STORAGE_PREFIX = `family-archery-3d:v${STORAGE_VERSION}`;

export const STORAGE_KEYS = {
  records: `${STORAGE_PREFIX}:records`,
  calibration: `${STORAGE_PREFIX}:calibration`,
  settings: `${STORAGE_PREFIX}:settings`,
  storyFlags: `${STORAGE_PREFIX}:storyFlags`,
  unlockedModes: `${STORAGE_PREFIX}:unlockedModes`,
} as const;

export function createDefaultSettings(): AppSettings {
  return {
    profileName: '정우 가족 대표팀',
    preferredInput: 'auto',
    reduceMotion: false,
    audioEnabled: true,
    hapticsEnabled: true,
    debugOverlay: false,
    dominantHand: 'right',
  };
}

export function createDefaultStoryFlags(): StoryFlags {
  return {
    seenEventIds: [],
    lastShownMatchIndex: {},
    totalMatchesPlayed: 0,
  };
}

export function createDefaultSnapshot(): AppStorageSnapshot {
  return {
    records: [],
    calibration: null,
    settings: createDefaultSettings(),
    unlockedModes: [...DEFAULT_UNLOCKED_MODES],
    storyFlags: createDefaultStoryFlags(),
  };
}

function normalizeRecords(value: unknown): MatchRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is MatchRecord => {
    return typeof entry === 'object' && entry !== null && 'id' in entry && 'totalScore' in entry;
  });
}

function normalizeCalibration(value: unknown): CalibrationProfile | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as CalibrationProfile;
  if (!candidate.inputMode || !candidate.sensitivity || !candidate.neutral) {
    return null;
  }

  return candidate;
}

export function hydrateSnapshot(source: {
  records?: unknown;
  calibration?: unknown;
  settings?: unknown;
  storyFlags?: unknown;
  unlockedModes?: unknown;
}): AppStorageSnapshot {
  const defaults = createDefaultSnapshot();
  const unlockedModes =
    Array.isArray(source.unlockedModes) && source.unlockedModes.length > 0
      ? ([...new Set(source.unlockedModes)] as AppStorageSnapshot['unlockedModes'])
      : defaults.unlockedModes;

  return {
    records: normalizeRecords(source.records),
    calibration: normalizeCalibration(source.calibration),
    settings: {
      ...defaults.settings,
      ...(typeof source.settings === 'object' && source.settings !== null ? source.settings : {}),
    },
    storyFlags: {
      ...defaults.storyFlags,
      ...(typeof source.storyFlags === 'object' && source.storyFlags !== null ? source.storyFlags : {}),
    },
    unlockedModes,
  };
}

import { hydrateSnapshot, STORAGE_KEYS } from './migrations';
import type { AppSettings, AppStorageSnapshot, CalibrationProfile, MatchRecord, ModeId, ResetScope, StoryFlags } from '../types';

function safeRead<T>(key: string): T | undefined {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function safeWrite(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadSnapshot(): AppStorageSnapshot {
  return hydrateSnapshot({
    records: safeRead<MatchRecord[]>(STORAGE_KEYS.records),
    calibration: safeRead<CalibrationProfile | null>(STORAGE_KEYS.calibration),
    settings: safeRead<AppSettings>(STORAGE_KEYS.settings),
    storyFlags: safeRead<StoryFlags>(STORAGE_KEYS.storyFlags),
    unlockedModes: safeRead<ModeId[]>(STORAGE_KEYS.unlockedModes),
  });
}

export function saveRecords(records: MatchRecord[]): void {
  safeWrite(STORAGE_KEYS.records, records);
}

export function saveCalibration(calibration: CalibrationProfile | null): void {
  safeWrite(STORAGE_KEYS.calibration, calibration);
}

export function saveSettings(settings: AppSettings): void {
  safeWrite(STORAGE_KEYS.settings, settings);
}

export function saveStoryFlags(storyFlags: StoryFlags): void {
  safeWrite(STORAGE_KEYS.storyFlags, storyFlags);
}

export function saveUnlockedModes(unlockedModes: ModeId[]): void {
  safeWrite(STORAGE_KEYS.unlockedModes, [...new Set(unlockedModes)]);
}

export function resetScope(scope: ResetScope): void {
  if (scope === 'records' || scope === 'all') {
    window.localStorage.removeItem(STORAGE_KEYS.records);
    window.localStorage.removeItem(STORAGE_KEYS.storyFlags);
    window.localStorage.removeItem(STORAGE_KEYS.unlockedModes);
  }

  if (scope === 'calibration' || scope === 'all') {
    window.localStorage.removeItem(STORAGE_KEYS.calibration);
  }

  if (scope === 'all') {
    window.localStorage.removeItem(STORAGE_KEYS.settings);
  }
}

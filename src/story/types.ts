import type { ModeId, ResultBand } from '../types';
import type { PortraitKey } from '../data/portraits';

export type SpeakerName = '아빠' | '엄마' | '세연' | '정우';
export type StoryDelivery = 'toast' | 'overlay' | 'scene';
export type StoryTriggerType =
  | 'first_launch'
  | 'first_calibration_complete'
  | 'first_ten'
  | 'first_bullseye'
  | 'low_score_streak'
  | 'personal_best'
  | 'mode_unlocked'
  | 'match_end'
  | 'home_comment';

export interface StoryLine {
  speaker: SpeakerName;
  portraitKey: PortraitKey;
  text: string;
}

export interface StoryTrigger {
  type: StoryTriggerType;
  mode?: ModeId;
  resultBand?: ResultBand;
  unlockedMode?: ModeId;
}

export interface StoryEvent {
  id: string;
  delivery: StoryDelivery;
  once?: boolean;
  cooldownMatches?: number;
  priority: number;
  trigger: StoryTrigger;
  lines: StoryLine[];
}

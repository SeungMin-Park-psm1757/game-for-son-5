import { STORY_EVENTS } from './storyEvents';
import type { StoryEvent, StoryTrigger } from './types';
import type { StoryFlags } from '../types';

export class StoryEngine {
  constructor(private readonly storyFlags: StoryFlags) {}

  public pickEvent(trigger: StoryTrigger): StoryEvent | null {
    const candidates = STORY_EVENTS.filter((event) => this.matches(event, trigger))
      .filter((event) => this.passesRules(event))
      .sort((left, right) => right.priority - left.priority);

    return candidates[0] ?? null;
  }

  public getRandomHomeComment(): StoryEvent {
    const comments = STORY_EVENTS.filter((event) => event.trigger.type === 'home_comment');
    return comments[Math.floor(Math.random() * comments.length)];
  }

  public markShown(event: StoryEvent): StoryFlags {
    const seenEventIds = event.once
      ? [...new Set([...this.storyFlags.seenEventIds, event.id])]
      : [...this.storyFlags.seenEventIds];

    return {
      ...this.storyFlags,
      seenEventIds,
      lastShownMatchIndex: {
        ...this.storyFlags.lastShownMatchIndex,
        [event.id]: this.storyFlags.totalMatchesPlayed,
      },
    };
  }

  public incrementMatchCount(): StoryFlags {
    return {
      ...this.storyFlags,
      totalMatchesPlayed: this.storyFlags.totalMatchesPlayed + 1,
    };
  }

  private matches(event: StoryEvent, trigger: StoryTrigger): boolean {
    if (event.trigger.type !== trigger.type) {
      return false;
    }
    if (event.trigger.mode && event.trigger.mode !== trigger.mode) {
      return false;
    }
    if (event.trigger.resultBand && event.trigger.resultBand !== trigger.resultBand) {
      return false;
    }
    if (event.trigger.unlockedMode && event.trigger.unlockedMode !== trigger.unlockedMode) {
      return false;
    }
    return true;
  }

  private passesRules(event: StoryEvent): boolean {
    if (event.once && this.storyFlags.seenEventIds.includes(event.id)) {
      return false;
    }
    if (event.cooldownMatches) {
      const lastShown = this.storyFlags.lastShownMatchIndex[event.id];
      if (typeof lastShown === 'number' && this.storyFlags.totalMatchesPlayed - lastShown < event.cooldownMatches) {
        return false;
      }
    }
    return true;
  }
}

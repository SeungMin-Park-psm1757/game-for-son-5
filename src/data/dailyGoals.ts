import type { MatchRecord } from '../types';

export type DailyGoalId =
  | 'play-one-match'
  | 'practice-once'
  | 'score-50'
  | 'score-total-120'
  | 'hit-one-x'
  | 'beat-rival';

export interface DailyGoalDefinition {
  id: DailyGoalId;
  icon: string;
  title: string;
  target: number;
}

export interface DailyGoalStatus extends DailyGoalDefinition {
  progress: number;
  completed: boolean;
  detail: string;
}

const GOAL_POOL: DailyGoalDefinition[] = [
  { id: 'play-one-match', icon: '🏹', title: '오늘 경기 1회', target: 1 },
  { id: 'practice-once', icon: '🎯', title: '연습 1회', target: 1 },
  { id: 'score-50', icon: '🥇', title: '한 경기 50점', target: 50 },
  { id: 'score-total-120', icon: '📈', title: '오늘 합계 120점', target: 120 },
  { id: 'hit-one-x', icon: '✨', title: 'X링 1회', target: 1 },
  { id: 'beat-rival', icon: '⚔️', title: '라이벌 1승', target: 1 },
];

export function getDailyGoalStatuses(records: MatchRecord[], today = new Date()): DailyGoalStatus[] {
  const todayKey = getDayKey(today.getTime());
  const todaysRecords = records.filter((record) => getDayKey(record.timestamp) === todayKey);
  const selectedGoals = pickGoalsForDay(todayKey);
  return selectedGoals.map((goal) => computeGoalStatus(goal, todaysRecords));
}

export function getNewlyCompletedGoalIds(previousRecords: MatchRecord[], nextRecords: MatchRecord[], today = new Date()): DailyGoalId[] {
  const previous = getDailyGoalStatuses(previousRecords, today);
  const next = getDailyGoalStatuses(nextRecords, today);
  return next.filter((goal) => goal.completed && !previous.find((entry) => entry.id === goal.id)?.completed).map((goal) => goal.id);
}

export function getGoalTitle(goalId: DailyGoalId): string {
  return GOAL_POOL.find((goal) => goal.id === goalId)?.title ?? '오늘 목표';
}

function pickGoalsForDay(dayKey: string): DailyGoalDefinition[] {
  const seed = hashString(dayKey);
  const pool = [...GOAL_POOL];
  const selected: DailyGoalDefinition[] = [];

  let cursor = seed;
  while (selected.length < 3 && pool.length > 0) {
    const index = cursor % pool.length;
    selected.push(pool.splice(index, 1)[0]!);
    cursor = (cursor * 1664525 + 1013904223) >>> 0;
  }

  return selected;
}

function computeGoalStatus(goal: DailyGoalDefinition, records: MatchRecord[]): DailyGoalStatus {
  if (goal.id === 'play-one-match') {
    return createStatus(goal, records.length, `${Math.min(records.length, goal.target)}/${goal.target} 경기`);
  }

  if (goal.id === 'practice-once') {
    const progress = records.filter((record) => record.mode === 'practice6').length;
    return createStatus(goal, progress, `${Math.min(progress, goal.target)}/${goal.target} 연습`);
  }

  if (goal.id === 'score-50') {
    const progress = records.reduce((best, record) => Math.max(best, record.totalScore), 0);
    return createStatus(goal, progress, `${Math.min(progress, goal.target)}/${goal.target} 점`);
  }

  if (goal.id === 'score-total-120') {
    const progress = records.reduce((sum, record) => sum + record.totalScore, 0);
    return createStatus(goal, progress, `${Math.min(progress, goal.target)}/${goal.target} 점`);
  }

  if (goal.id === 'hit-one-x') {
    const progress = records.reduce((sum, record) => sum + record.xCount, 0);
    return createStatus(goal, progress, `${Math.min(progress, goal.target)}/${goal.target} X`);
  }

  const progress = records.filter((record) => record.didBeatRival).length;
  return createStatus(goal, progress, `${Math.min(progress, goal.target)}/${goal.target} 승`);
}

function createStatus(goal: DailyGoalDefinition, rawProgress: number, detail: string): DailyGoalStatus {
  const progress = Math.min(rawProgress, goal.target);
  return {
    ...goal,
    progress,
    completed: progress >= goal.target,
    detail,
  };
}

function getDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

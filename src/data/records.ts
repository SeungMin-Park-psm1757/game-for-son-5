import type { MatchRecord } from '../types';

export function sortByScore(records: MatchRecord[]): MatchRecord[] {
  return [...records].sort((left, right) => {
    if (right.totalScore !== left.totalScore) {
      return right.totalScore - left.totalScore;
    }
    if (right.xCount !== left.xCount) {
      return right.xCount - left.xCount;
    }
    return right.timestamp - left.timestamp;
  });
}

export function sortByXCount(records: MatchRecord[]): MatchRecord[] {
  return [...records].sort((left, right) => {
    if (right.xCount !== left.xCount) {
      return right.xCount - left.xCount;
    }
    if (right.totalScore !== left.totalScore) {
      return right.totalScore - left.totalScore;
    }
    return right.timestamp - left.timestamp;
  });
}

export function sortByRecent(records: MatchRecord[]): MatchRecord[] {
  return [...records].sort((left, right) => right.timestamp - left.timestamp);
}

export function getTopScoreRecords(records: MatchRecord[], limit = 5): MatchRecord[] {
  return sortByScore(records).slice(0, limit);
}

export function getTopXRecords(records: MatchRecord[], limit = 5): MatchRecord[] {
  return sortByXCount(records).slice(0, limit);
}

export function getRecentRecords(records: MatchRecord[], limit = 10): MatchRecord[] {
  return sortByRecent(records).slice(0, limit);
}

export function isPersonalBest(nextRecord: MatchRecord, existingRecords: MatchRecord[]): boolean {
  const best = sortByScore(existingRecords)[0];

  if (!best) {
    return true;
  }
  if (nextRecord.totalScore !== best.totalScore) {
    return nextRecord.totalScore > best.totalScore;
  }
  if (nextRecord.xCount !== best.xCount) {
    return nextRecord.xCount > best.xCount;
  }
  return nextRecord.timestamp > best.timestamp;
}

export function getScoreRank(nextRecord: MatchRecord, existingRecords: MatchRecord[]): number {
  return sortByScore([...existingRecords, nextRecord]).findIndex((record) => record.id === nextRecord.id) + 1;
}

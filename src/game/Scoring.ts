import type { ShotScore } from './types';

export const TARGET_RADIUS = 0.61;
export const RING_WIDTH = TARGET_RADIUS / 10;
export const X_RING_RADIUS = RING_WIDTH * 0.55;

export function scoreTarget(hitX: number, hitY: number): ShotScore {
  const distance = Math.hypot(hitX, hitY);

  if (distance > TARGET_RADIUS) {
    return {
      score: 0,
      isX: false,
      isBullseye: false,
      distance,
      hitX,
      hitY,
    };
  }

  const ringIndex = Math.floor(distance / RING_WIDTH);
  const score = Math.max(1, 10 - ringIndex);

  return {
    score,
    isX: distance <= X_RING_RADIUS,
    isBullseye: score === 10,
    distance,
    hitX,
    hitY,
  };
}

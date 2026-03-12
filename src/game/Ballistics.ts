import { Vector3 } from 'three';

export interface BallisticInput {
  aimYaw: number;
  aimPitch: number;
  drawDuration: number;
  wind: number;
  stability: number;
  releaseQuality: number;
}

export interface BallisticResult {
  hitX: number;
  hitY: number;
  path: Vector3[];
}

const TARGET_DISTANCE = 30;
const TARGET_CENTER_Y = 1.58;
const GRAVITY = new Vector3(0, -9.2, 0);
const BASE_LAUNCH_Y = 1.52;
const AIM_YAW_RANGE = 0.58;
const AIM_PITCH_RANGE = 0.46;
const AIM_TARGET_EDGE_X = 0.66;
const AIM_TARGET_EDGE_Y = 0.64;

function computeLaunchSpeed(drawDuration: number): number {
  const ratio = Math.min(1, Math.max(0.28, drawDuration / 1.3));
  return 35 + ratio * 11;
}

function jitter(scale: number): number {
  return (Math.random() - 0.5) * scale;
}

export function simulateArrowFlight(input: BallisticInput): BallisticResult {
  const speed = computeLaunchSpeed(input.drawDuration);
  const aimPoint = resolveAimPoint(input.aimYaw, input.aimPitch);
  const yawAngle = Math.atan2(aimPoint.targetX, TARGET_DISTANCE) + jitter((1 - input.stability) * 0.008) + jitter((1 - input.releaseQuality) * 0.006);
  const horizontalDistance = Math.hypot(TARGET_DISTANCE, aimPoint.targetX);
  const pitchAngle =
    solveLaunchPitch(horizontalDistance, TARGET_CENTER_Y + aimPoint.targetY - BASE_LAUNCH_Y, speed) +
    jitter((1 - input.releaseQuality) * 0.008);
  const direction = new Vector3(
    Math.sin(yawAngle) * Math.cos(pitchAngle),
    Math.sin(pitchAngle),
    -Math.cos(yawAngle) * Math.cos(pitchAngle),
  ).normalize();
  const velocity = direction.multiplyScalar(speed);
  const position = new Vector3(0, BASE_LAUNCH_Y, 0);
  const windForce = new Vector3(input.wind * 0.02, 0, 0);
  const path: Vector3[] = [position.clone()];
  let previous = position.clone();

  for (let step = 0; step < 360; step += 1) {
    const delta = 1 / 90;
    velocity.addScaledVector(GRAVITY, delta);
    velocity.addScaledVector(windForce, delta);
    position.addScaledVector(velocity, delta);
    path.push(position.clone());

    if (position.z <= -TARGET_DISTANCE) {
      const depthSpan = previous.z - position.z;
      const ratio = depthSpan === 0 ? 0 : (previous.z + TARGET_DISTANCE) / depthSpan;
      const hitX = previous.x + (position.x - previous.x) * ratio;
      const hitY = previous.y + (position.y - previous.y) * ratio - TARGET_CENTER_Y;

      return { hitX, hitY, path };
    }

    previous = position.clone();
  }

  return {
    hitX: position.x,
    hitY: position.y - TARGET_CENTER_Y,
    path,
  };
}

export function resolveAimPoint(aimYaw: number, aimPitch: number): { targetX: number; targetY: number } {
  const normalizedYaw = clamp(aimYaw / AIM_YAW_RANGE, -1, 1);
  const normalizedPitch = clamp(aimPitch / AIM_PITCH_RANGE, -1, 1);

  return {
    targetX: normalizedYaw * AIM_TARGET_EDGE_X,
    targetY: normalizedPitch * AIM_TARGET_EDGE_Y,
  };
}

export { TARGET_CENTER_Y, TARGET_DISTANCE };

function solveLaunchPitch(horizontalDistance: number, targetHeight: number, speed: number): number {
  const gravity = Math.abs(GRAVITY.y);
  const speedSquared = speed * speed;
  const discriminant = speedSquared * speedSquared - gravity * (gravity * horizontalDistance * horizontalDistance + 2 * targetHeight * speedSquared);

  if (discriminant <= 0) {
    return Math.atan2(targetHeight, horizontalDistance);
  }

  return Math.atan((speedSquared - Math.sqrt(discriminant)) / (gravity * horizontalDistance));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

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

const TARGET_DISTANCE = 38;
const TARGET_CENTER_Y = 1.58;
const GRAVITY = new Vector3(0, -9.4, 0);
const BASE_LAUNCH_Y = 1.52;
const BASE_PITCH = 0.064;

function computeLaunchSpeed(drawDuration: number): number {
  const ratio = Math.min(1, Math.max(0.2, drawDuration / 1.45));
  return 38 + ratio * 20;
}

function jitter(scale: number): number {
  return (Math.random() - 0.5) * scale;
}

export function simulateArrowFlight(input: BallisticInput): BallisticResult {
  const speed = computeLaunchSpeed(input.drawDuration);
  const yawAngle = input.aimYaw * 0.11 + jitter((1 - input.stability) * 0.05) + jitter((1 - input.releaseQuality) * 0.03);
  const pitchAngle = BASE_PITCH + input.aimPitch * 0.085 + jitter((1 - input.releaseQuality) * 0.03);
  const direction = new Vector3(Math.sin(yawAngle), Math.sin(pitchAngle), -1).normalize();
  const velocity = direction.multiplyScalar(speed);
  const position = new Vector3(0, BASE_LAUNCH_Y, 0);
  const windForce = new Vector3(input.wind * 0.24, 0, 0);
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

export { TARGET_CENTER_Y, TARGET_DISTANCE };

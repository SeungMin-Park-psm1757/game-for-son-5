export interface FilteredAimSample {
  yaw: number;
  pitch: number;
  smoothedYaw: number;
  smoothedPitch: number;
}

function applyDeadzone(value: number, deadzone: number): number {
  if (Math.abs(value) <= deadzone) {
    return 0;
  }

  const adjusted = (Math.abs(value) - deadzone) / Math.max(1 - deadzone, 0.0001);
  return Math.sign(value) * adjusted;
}

export class AimFilter {
  private smoothedYaw = 0;
  private smoothedPitch = 0;
  private initialized = false;

  constructor(private alpha = 0.2, private deadzone = 0.02) {}

  public configure(alpha: number, deadzone: number): void {
    this.alpha = alpha;
    this.deadzone = deadzone;
  }

  public reset(): void {
    this.smoothedYaw = 0;
    this.smoothedPitch = 0;
    this.initialized = false;
  }

  public update(raw: { yaw: number; pitch: number }): FilteredAimSample {
    if (!this.initialized) {
      this.smoothedYaw = raw.yaw;
      this.smoothedPitch = raw.pitch;
      this.initialized = true;
    } else {
      this.smoothedYaw += (raw.yaw - this.smoothedYaw) * this.alpha;
      this.smoothedPitch += (raw.pitch - this.smoothedPitch) * this.alpha;
    }

    return {
      yaw: applyDeadzone(this.smoothedYaw, this.deadzone),
      pitch: applyDeadzone(this.smoothedPitch, this.deadzone),
      smoothedYaw: this.smoothedYaw,
      smoothedPitch: this.smoothedPitch,
    };
  }
}

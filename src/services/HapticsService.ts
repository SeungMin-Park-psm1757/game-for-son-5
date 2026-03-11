export class HapticsService {
  private enabled = true;

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public pulse(pattern: number | number[]): void {
    if (!this.enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
      return;
    }

    navigator.vibrate(pattern);
  }
}

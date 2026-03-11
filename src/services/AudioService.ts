export class AudioService {
  private audioContext: AudioContext | null = null;
  private enabled = true;

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public async resume(): Promise<void> {
    if (!this.enabled || typeof window === 'undefined') {
      return;
    }

    const AudioContextCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioContextCtor();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public playShot(): void {
    this.playTone(180, 0.08, 'triangle', 0.025);
  }

  public playImpact(highlighted: boolean): void {
    this.playTone(highlighted ? 560 : 320, highlighted ? 0.16 : 0.1, 'sine', highlighted ? 0.04 : 0.03);
  }

  public playCelebrate(): void {
    this.playTone(660, 0.08, 'sine', 0.03);
    window.setTimeout(() => this.playTone(820, 0.1, 'triangle', 0.025), 80);
  }

  private playTone(frequency: number, duration: number, type: OscillatorType, gainValue: number): void {
    if (!this.enabled || !this.audioContext) {
      return;
    }

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = gainValue;
    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }
}

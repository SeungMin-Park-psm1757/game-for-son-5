export class WindSystem {
  private current = 0;

  public next(arrowIndex: number): number {
    const drift = (Math.random() - 0.5) * 1.2;
    if (arrowIndex === 0) {
      this.current = drift;
    } else {
      this.current = Math.max(-2.3, Math.min(2.3, this.current * 0.55 + drift));
    }
    return this.current;
  }

  public describe(value: number): string {
    if (Math.abs(value) < 0.35) {
      return '고요';
    }
    return value > 0 ? `우풍 ${value.toFixed(1)}` : `좌풍 ${Math.abs(value).toFixed(1)}`;
  }
}

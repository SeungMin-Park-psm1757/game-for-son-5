export class WindSystem {
  private current = 0;

  public next(arrowIndex: number): number {
    const drift = (Math.random() - 0.5) * 0.28;
    if (arrowIndex === 0) {
      this.current = drift;
    } else {
      this.current = clamp(this.current * 0.65 + drift, -0.9, 0.9);
    }
    return this.current;
  }

  public describe(value: number): string {
    if (Math.abs(value) < 0.12) {
      return '고요';
    }
    return value > 0 ? `우풍 ${value.toFixed(1)}` : `좌풍 ${Math.abs(value).toFixed(1)}`;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

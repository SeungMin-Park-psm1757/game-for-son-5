export class WindSystem {
  private current = 0;

  public next(arrowIndex: number): number {
    const drift = (Math.random() - 0.5) * 0.18;
    if (arrowIndex === 0) {
      this.current = drift;
    } else {
      this.current = clamp(this.current * 0.72 + drift, -0.55, 0.55);
    }
    return this.current;
  }

  public describe(value: number): string {
    if (Math.abs(value) < 0.08) {
      return '고요';
    }

    return value > 0 ? `우풍 ${value.toFixed(1)}` : `좌풍 ${Math.abs(value).toFixed(1)}`;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

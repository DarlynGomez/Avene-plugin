export interface Clock {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}

export const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms))
};

/** Keeps the tokens spent in any window under a limit, a call reserves its worst case first */
export class TokenWindow {
  private readonly spent: { at: number; tokens: number }[] = [];

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly clock: Clock
  ) {}

  private used(): number {
    const cutoff = this.clock.now() - this.windowMs;
    while (this.spent.length > 0 && this.spent[0].at <= cutoff) this.spent.shift();
    return this.spent.reduce((sum, entry) => sum + entry.tokens, 0);
  }

  /** Waits until the estimate fits, then holds it, settle replaces it with what was really used */
  async reserve(estimate: number): Promise<{ at: number; tokens: number }> {
    if (estimate > this.limit) throw new Error("A single call is larger than the token limit");
    while (this.used() + estimate > this.limit) {
      const oldest = this.spent[0];
      await this.clock.sleep(Math.max(oldest.at + this.windowMs - this.clock.now(), 50));
    }
    const hold = { at: this.clock.now(), tokens: estimate };
    this.spent.push(hold);
    return hold;
  }

  settle(hold: { tokens: number }, actual: number): void {
    hold.tokens = actual;
  }
}

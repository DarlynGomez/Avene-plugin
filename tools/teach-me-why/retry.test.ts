import { describe, expect, it } from "vitest";
import { TokenWindow, type Clock } from "./rateLimit";
import { backoffMs, retryAfterMs, withRateLimitRetry } from "./retry";

function fakeClock(): Clock & { slept: number[]; time: number } {
  const clock = {
    time: 0,
    slept: [] as number[],
    now: () => clock.time,
    sleep: (ms: number) => {
      clock.slept.push(ms);
      clock.time += ms;
      return Promise.resolve();
    }
  };
  return clock;
}
const options = (clock: Clock) => ({
  maxRetries: 3,
  baseMs: 1000,
  capMs: 8000,
  random: () => 1,
  clock
});

describe("retryAfterMs", () => {
  it("reads seconds and dates, from plain objects and Headers", () => {
    expect(retryAfterMs({ headers: { "retry-after": "7" } }, 0)).toBe(7000);
    expect(retryAfterMs({ headers: new Headers({ "retry-after": "2" }) }, 0)).toBe(2000);
    expect(retryAfterMs({ headers: { "retry-after": new Date(5000).toUTCString() } }, 1000)).toBe(
      4000
    );
    expect(retryAfterMs({}, 0)).toBeNull();
  });
});

describe("backoffMs", () => {
  it("doubles up to the cap, with jitter between half and full", () => {
    const clock = fakeClock();
    expect(backoffMs(0, null, options(clock))).toBe(1000);
    expect(backoffMs(2, null, options(clock))).toBe(4000);
    expect(backoffMs(9, null, options(clock))).toBe(8000);
    expect(backoffMs(0, null, { ...options(clock), random: () => 0 })).toBe(500);
  });
  it("never waits less than Retry-After", () => {
    expect(backoffMs(0, 30000, options(fakeClock()))).toBe(30000);
  });
});

describe("withRateLimitRetry", () => {
  it("retries a 429 and then succeeds", async () => {
    const clock = fakeClock();
    let calls = 0;
    const result = await withRateLimitRetry(async () => {
      calls++;
      if (calls < 3) throw Object.assign(new Error("slow down"), { status: 429 });
      return "ok";
    }, options(clock));
    expect(result).toBe("ok");
    expect(clock.slept).toEqual([1000, 2000]);
  });
  it("throws any other error at once, and a 429 after the last retry", async () => {
    const clock = fakeClock();
    await expect(
      withRateLimitRetry(
        () => Promise.reject(Object.assign(new Error("x"), { status: 500 })),
        options(clock)
      )
    ).rejects.toThrow("x");
    expect(clock.slept).toEqual([]);
    await expect(
      withRateLimitRetry(
        () => Promise.reject(Object.assign(new Error("y"), { status: 429 })),
        options(clock)
      )
    ).rejects.toThrow("y");
    expect(clock.slept).toHaveLength(3);
  });
});

describe("TokenWindow", () => {
  it("waits for the window to clear before going over the limit", async () => {
    const clock = fakeClock();
    const window = new TokenWindow(10000, 60000, clock);
    const first = await window.reserve(6000);
    window.settle(first, 6000);
    await window.reserve(3000);
    expect(clock.slept).toEqual([]);
    await window.reserve(3000);
    expect(clock.slept[0]).toBe(60000);
    expect(clock.time).toBe(60000);
  });
  it("counts what was really used, not the estimate", async () => {
    const clock = fakeClock();
    const window = new TokenWindow(10000, 60000, clock);
    const hold = await window.reserve(9000);
    window.settle(hold, 1000);
    await window.reserve(9000);
    expect(clock.slept).toEqual([]);
  });
  it("refuses a single call larger than the limit", async () => {
    await expect(new TokenWindow(100, 1000, fakeClock()).reserve(101)).rejects.toThrow();
  });
});

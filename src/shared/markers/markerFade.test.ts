import { describe, expect, it } from "vitest";

import { FADE_FLOOR, FADE_FULL_MS, FADE_STEP, fadeOpacity } from "./markerFade";

const AT = "2026-11-13T10:00:00.000Z";
const later = (ms: number) => Date.parse(AT) + ms;

describe("fadeOpacity", () => {
  it("is solid for an issue with no deferral time, one that cannot be read, and one just put off", () => {
    expect(fadeOpacity(undefined, later(FADE_FULL_MS))).toBe(1);
    expect(fadeOpacity("not a time", later(FADE_FULL_MS))).toBe(1);
    expect(fadeOpacity(AT, later(0))).toBe(1);
    expect(fadeOpacity(AT, later(-5000))).toBe(1);
  });

  it("falls as the time since the deferral passes, never rises, and stops at the floor", () => {
    let previous = 1;
    for (let step = 0; step <= 40; step += 1) {
      const opacity = fadeOpacity(AT, later((FADE_FULL_MS * step) / 30));
      expect(opacity).toBeLessThanOrEqual(previous);
      expect(opacity).toBeGreaterThanOrEqual(FADE_FLOOR);
      previous = opacity;
    }
    expect(fadeOpacity(AT, later(FADE_FULL_MS))).toBe(FADE_FLOOR);
    expect(fadeOpacity(AT, later(FADE_FULL_MS * 50))).toBe(FADE_FLOOR);
  });

  it("is halfway between solid and the floor halfway through", () => {
    expect(fadeOpacity(AT, later(FADE_FULL_MS / 2))).toBeCloseTo((1 + FADE_FLOOR) / 2, 1);
  });

  it("moves in whole steps, so the canvas is written only when a step changes", () => {
    for (const ms of [1000, 70_000, 300_000, 1_000_000]) {
      const opacity = fadeOpacity(AT, later(ms));
      const steps = opacity / FADE_STEP;
      expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-6);
    }
  });
});

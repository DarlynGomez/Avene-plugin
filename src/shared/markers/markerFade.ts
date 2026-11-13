/** How long a deferred marker takes to fade from solid to its faintest, one number to change */
export const FADE_FULL_MS = 30 * 60 * 1000;

/** The faintest a deferred fill gets, below this the shape would be lost on a light page */
export const FADE_FLOOR = 0.35;

/** The fill opacity moves in steps of this, so the canvas is only written when the step changes */
export const FADE_STEP = 0.05;

/** How often a shown deferred marker is looked at again, a quiet repaint with no undo step */
export const FADE_REFRESH_MS = 60 * 1000;

/**
 * The fill opacity of a deferred marker: solid when it was just put off, fading with the time since
 * An issue with no deferral time, or one that cannot be read, stays solid
 */
export function fadeOpacity(deferredAt: string | undefined, now: number): number {
  if (deferredAt === undefined) return 1;
  const since = now - Date.parse(deferredAt);
  if (!Number.isFinite(since) || since <= 0) return 1;
  const progress = Math.min(since / FADE_FULL_MS, 1);
  const raw = 1 - progress * (1 - FADE_FLOOR);
  return Number((Math.round(raw / FADE_STEP) * FADE_STEP).toFixed(2));
}

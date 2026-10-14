import type { Clock } from "./rateLimit";

interface HttpLikeError {
  status?: number;
  headers?: { get?: (name: string) => string | null } | Record<string, string | undefined>;
}

function headerOf(error: HttpLikeError, name: string): string | null {
  const headers = error.headers;
  if (!headers) return null;
  if (typeof (headers as { get?: unknown }).get === "function") {
    return (headers as { get: (n: string) => string | null }).get(name);
  }
  return (headers as Record<string, string | undefined>)[name] ?? null;
}

/** Retry-After is seconds or a date, returns milliseconds or null */
export function retryAfterMs(error: HttpLikeError, now: number): number | null {
  const value = headerOf(error, "retry-after");
  if (value === null) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

export interface RetryOptions {
  maxRetries: number;
  baseMs: number;
  capMs: number;
  random: () => number;
  clock: Clock;
}

/** Waits at least as long as the service asks, else an exponential delay with jitter */
export function backoffMs(
  attempt: number,
  retryAfter: number | null,
  options: RetryOptions
): number {
  const exponential = Math.min(options.capMs, options.baseMs * 2 ** attempt);
  const jittered = exponential * (0.5 + options.random() * 0.5);
  return Math.max(retryAfter ?? 0, jittered);
}

/** Retries only a 429, anything else is thrown at once */
export async function withRateLimitRetry<T>(
  call: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call();
    } catch (error) {
      const http = error as HttpLikeError;
      if (http.status !== 429 || attempt >= options.maxRetries) throw error;
      const wait = backoffMs(attempt, retryAfterMs(http, options.clock.now()), options);
      console.log(`Rate limited, waiting ${Math.round(wait / 1000)} seconds`);
      await options.clock.sleep(wait);
    }
  }
}

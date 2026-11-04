import { fits } from "../handoff/limits";

export interface DeferralRecord {
  count: number;
  lastAt: string;
}

/** Keyed by root signature, the panel works the signature out and the sandbox only stores it */
export type DeferralMap = Record<string, DeferralRecord>;

function isRecord(value: unknown): value is DeferralRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.count === "number" &&
    Number.isInteger(v.count) &&
    v.count >= 1 &&
    typeof v.lastAt === "string"
  );
}

export function parseDeferrals(raw: string): DeferralMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => isRecord(value))
    ) as DeferralMap;
  } catch {
    return {};
  }
}

/** Empty text when nothing is counted, so the entry can be cleared */
export function serializeDeferrals(map: DeferralMap): string {
  return Object.keys(map).length === 0 ? "" : JSON.stringify(map);
}

export function recordDeferral(map: DeferralMap, signature: string, at: string): DeferralMap {
  const count = (map[signature]?.count ?? 0) + 1;
  return { ...map, [signature]: { count, lastAt: at } };
}

/** A root that was scheduled or decided starts again from none */
export function clearDeferrals(map: DeferralMap, signatures: readonly string[]): DeferralMap {
  const drop = new Set(signatures);
  return Object.fromEntries(Object.entries(map).filter(([signature]) => !drop.has(signature)));
}

/** Roots that are gone or decided no longer count, the live set comes from the panel */
export function pruneDeferrals(map: DeferralMap, live: ReadonlySet<string>): DeferralMap {
  return Object.fromEntries(Object.entries(map).filter(([signature]) => live.has(signature)));
}

export function countsOf(map: DeferralMap): Record<string, number> {
  return Object.fromEntries(
    Object.entries(map).map(([signature, record]) => [signature, record.count])
  );
}

export const deferralsFit = (map: DeferralMap): boolean => fits(serializeDeferrals(map));

import { cutChars, META_LONG_MAX_CHARS, META_SHORT_MAX_CHARS } from "./limits";
import type { HandoffItemMeta } from "./types";

export type HandoffMetaMap = Record<string, HandoffItemMeta>;

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const cut = cutChars(value.trim(), max);
  return cut === "" ? undefined : cut;
}

/** Null when the shape is wrong, an empty field is dropped so nothing prints for it */
export function normalizeMeta(value: unknown): HandoffItemMeta | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (raw.signOff !== "needs" && raw.signOff !== "signed") return null;
  if (typeof raw.leaveOut !== "boolean") return null;
  const parts = {
    revisitTrigger: text(raw.revisitTrigger, META_LONG_MAX_CHARS),
    mitigation: text(raw.mitigation, META_LONG_MAX_CHARS),
    decidedBy: text(raw.decidedBy, META_SHORT_MAX_CHARS),
    signedBy: text(raw.signedBy, META_SHORT_MAX_CHARS),
    signedAt: text(raw.signedAt, META_SHORT_MAX_CHARS)
  };
  const filled = Object.entries(parts).filter(([, v]) => v !== undefined);
  return { signOff: raw.signOff, leaveOut: raw.leaveOut, ...Object.fromEntries(filled) };
}

/** Nothing to remember: needs sign-off, not left out, no text */
function isDefault(meta: HandoffItemMeta): boolean {
  return meta.signOff === "needs" && !meta.leaveOut && Object.keys(meta).length === 2;
}

export function cleanMeta(map: Readonly<Record<string, unknown>>): HandoffMetaMap {
  const out: HandoffMetaMap = {};
  for (const [signature, value] of Object.entries(map)) {
    const meta = normalizeMeta(value);
    if (meta && !isDefault(meta)) out[signature] = meta;
  }
  return out;
}

export function parseMeta(raw: string): HandoffMetaMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? cleanMeta(parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function serializeMeta(map: Readonly<Record<string, unknown>>): string {
  const clean = cleanMeta(map);
  return Object.keys(clean).length === 0 ? "" : JSON.stringify(clean);
}

/** The signature comes from the panel, the sandbox never works one out */
export function setMeta(
  map: HandoffMetaMap,
  signature: string,
  meta: HandoffItemMeta
): HandoffMetaMap {
  return cleanMeta({ ...map, [signature]: meta });
}

/** Drops entries whose root no longer exists, the live set comes from the panel */
export function pruneMeta(map: HandoffMetaMap, live: ReadonlySet<string>): HandoffMetaMap {
  return Object.fromEntries(Object.entries(map).filter(([signature]) => live.has(signature)));
}

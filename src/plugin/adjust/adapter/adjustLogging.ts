import type { AdjustScopeChoice } from "../../../shared/adjustMessageTypes";
import { resolveCalibration } from "../../storage/calibrationStore";
import { STORAGE_KEY_ADJUST_LOG } from "../../storage/storageKeys";

export interface AdjustLogEntry {
  issueId: string;
  optionChosen: "a" | "b" | "c" | null;
  beforeHex: string;
  beforeRatio: number;
  afterHex: string | null;
  afterRatio: number | null;
  wasBound: boolean;
  wheelOpened: boolean;
  hexRejected: boolean;
  abandoned: boolean;
  /** The scope selected at the time, so an abandon still says what was weighed */
  scope: AdjustScopeChoice;
  instanceCount: number;
  loggedAt: string;
  /** Set only while a study session is active, consent then came from the signed paper form */
  consentSource?: "study-session";
}

function readStoredLog(): unknown[] {
  try {
    const raw = figma.root.getPluginData(STORAGE_KEY_ADJUST_LOG);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("adjustLogging: stored log was not valid JSON", error);
    return [];
  }
}

function isScopeChoice(value: unknown): value is AdjustScopeChoice {
  return value === "instances" || value === "variable";
}

// The log for anything that reads it
export function loadAdjustLog(): AdjustLogEntry[] {
  return readStoredLog()
    .filter(
      (entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null
    )
    .map((entry) => ({
      ...(entry as unknown as AdjustLogEntry),
      scope: isScopeChoice(entry.scope) ? entry.scope : "instances"
    }));
}

/** Only when loggingConsent is true, a silent no-op otherwise, never an error */
export async function logAdjustEvent(entry: AdjustLogEntry): Promise<void> {
  const resolution = await resolveCalibration();
  if (!resolution?.profile.loggingConsent) {
    return;
  }

  const log = readStoredLog();
  log.push(resolution.scope === "study" ? { ...entry, consentSource: "study-session" } : entry);
  try {
    figma.root.setPluginData(STORAGE_KEY_ADJUST_LOG, JSON.stringify(log));
  } catch (error) {
    console.error("logAdjustEvent: figma.root.setPluginData failed", error);
  }
}

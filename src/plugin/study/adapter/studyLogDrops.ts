import { STORAGE_KEY_STUDY_LOG } from "../../storage/storageKeys";

export type DropReason = "noSession" | "noConsent" | "contextMismatch" | "tooLarge" | "writeFailed";
export type DropCounts = Record<DropReason, number>;

export type AppendResult = { written: true } | { written: false; reason: DropReason };

export const META_KEY = `${STORAGE_KEY_STUDY_LOG}.meta`;
const emptyCounts = (): DropCounts => ({
  noSession: 0,
  noConsent: 0,
  contextMismatch: 0,
  tooLarge: 0,
  writeFailed: 0
});

// Drops seen by this run, the only place a no session drop can be counted
let memoryDrops = emptyCounts();

export function getDropCounts(): DropCounts {
  return { ...memoryDrops };
}

export function resetMemoryDropCounts(): void {
  memoryDrops = emptyCounts();
}

/** The drops that happened while a session was active, kept with the log */
export function loadPersistedDropCounts(): DropCounts {
  try {
    const parsed: unknown = JSON.parse(figma.root.getPluginData(META_KEY) || "{}");
    const counts = emptyCounts();
    for (const reason of Object.keys(counts) as DropReason[]) {
      const value = (parsed as Record<string, unknown>)[reason];
      counts[reason] = typeof value === "number" ? value : 0;
    }
    return counts;
  } catch {
    return emptyCounts();
  }
}

export function countDrop(reason: DropReason, sessionActive: boolean): AppendResult {
  memoryDrops[reason] += 1;
  if (sessionActive) {
    try {
      const counts = loadPersistedDropCounts();
      counts[reason] += 1;
      figma.root.setPluginData(META_KEY, JSON.stringify(counts));
    } catch (error) {
      console.error("studyLogStore: could not persist a drop count", error);
    }
  }
  return { written: false, reason };
}

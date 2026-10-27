import { parseFileUrl } from "../../../shared/handoff/links";
import { KEY_HANDOFF_FILE } from "../handoffKeys";
import { writeEntry, type StoreResult } from "./storeResult";

/** The pasted file address, or null when none was saved or it is no longer a valid one */
export function loadFileUrl(): string | null {
  const raw = figma.root.getPluginData(KEY_HANDOFF_FILE);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const url = (parsed as { url?: unknown } | null)?.url;
    return typeof url === "string" && parseFileUrl(url) ? url : null;
  } catch {
    return null;
  }
}

/** An empty string clears it, anything else must be a figma.com file address */
export function saveFileUrl(url: string): StoreResult {
  const trimmed = url.trim();
  if (trimmed === "") return writeEntry(figma.root, KEY_HANDOFF_FILE, "");
  if (!parseFileUrl(trimmed)) return { saved: false, error: "That is not a Figma file address" };
  return writeEntry(figma.root, KEY_HANDOFF_FILE, JSON.stringify({ v: 1, url: trimmed }));
}

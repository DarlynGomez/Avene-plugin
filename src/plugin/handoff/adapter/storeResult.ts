import { fits } from "../../../shared/handoff/limits";

export interface StoreResult {
  saved: boolean;
  error?: string;
}

function message(error: unknown): string {
  return error instanceof Error && error.message ? error.message : String(error);
}

/** Writes one entry, refuses a value over the size guard, and never throws */
export function writeEntry(
  target: { setPluginData: (key: string, value: string) => void },
  key: string,
  value: string
): StoreResult {
  if (!fits(value)) return { saved: false, error: "Too much text to keep in one entry" };
  try {
    target.setPluginData(key, value);
    return { saved: true };
  } catch (error) {
    return { saved: false, error: message(error) };
  }
}

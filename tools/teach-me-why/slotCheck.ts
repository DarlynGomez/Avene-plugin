import type { ExplanationKey } from "../../src/shared/teachMeWhy/explanationTypes";

/** The quick explanation is where both ratios have to appear */
export function slotsMissing(key: ExplanationKey, text: string): string[] {
  if (key.depth !== 1) return [];
  return ["{measured}", "{required}"].some((slot) => !text.includes(slot)) ? ["slots-missing"] : [];
}

/** Prompt version 3 asks the quick explanation for the fix, older reviewed text has none */
export function fixMissing(key: ExplanationKey, text: string): string[] {
  return key.depth === 1 && !text.includes("{fix}") ? ["fix-missing"] : [];
}

import type { ExplanationKey } from "../../src/shared/teachMeWhy/explanationTypes";

/** The quick explanation is where both ratios have to appear */
export function slotsMissing(key: ExplanationKey, text: string): string[] {
  if (key.depth !== 1) return [];
  return ["{measured}", "{required}"].some((slot) => !text.includes(slot)) ? ["slots-missing"] : [];
}

import { ELEMENT_ROLES } from "../teachMeWhy/explanationTypes";

const isRec = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A Teach Me Why key as it is logged, the four parts and nothing more */
export function explanationKeyOk(value: unknown): boolean {
  return (
    isRec(value) &&
    ELEMENT_ROLES.some((role) => role === value.role) &&
    (value.severity === "low" || value.severity === "medium" || value.severity === "high") &&
    (value.size === "normal" || value.size === "large") &&
    (value.depth === 1 || value.depth === 2 || value.depth === 3)
  );
}

export const depthOk = (value: unknown): boolean => value === 1 || value === 2 || value === 3;
export const sourceOk = (value: unknown): boolean => value === "tab" || value === "card";

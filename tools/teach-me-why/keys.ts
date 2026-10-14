import { ELEMENT_ROLES, type ExplanationKey } from "../../src/shared/teachMeWhy/explanationTypes";

/** All 126 keys in a fixed order */
export function allKeys(): ExplanationKey[] {
  const keys: ExplanationKey[] = [];
  for (const role of ELEMENT_ROLES)
    for (const severity of ["low", "medium", "high"] as const)
      for (const size of ["normal", "large"] as const)
        for (const depth of [1, 2, 3] as const) keys.push({ role, severity, size, depth });
  return keys;
}

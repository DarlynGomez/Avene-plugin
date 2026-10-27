import type { RuleId } from "../types";

/** These block an edit as well as reject raw model output, the others only warn on an edit */
export const HARD_RULES: readonly RuleId[] = ["R1", "R2", "R5"];

/** Slot id prefixes that hold a name or words, written out literally they are leaked text */
export const NAME_SLOT_PREFIXES: readonly string[] = ["L", "S", "b", "p", "w", "k"];

/** Slot id prefix of the criterion slot */
export const CRITERION_SLOT_PREFIX = "sc";

/** A name shorter than this is not matched as a literal, it would hit ordinary words */
export const MIN_NAME_LENGTH = 3;

import { DEPTH_WORD_LIMITS } from "../../src/shared/teachMeWhy/explanationTypes";

/**
 * The generator of the model written texts keeps the word limits it was built with
 * The plugin ships a Quick text only, so only depth 1 is in the shared limits
 */
export const GENERATOR_WORD_LIMITS = {
  1: DEPTH_WORD_LIMITS[1],
  2: { min: 60, max: 90 },
  3: { min: 100, max: 150 }
} as const;

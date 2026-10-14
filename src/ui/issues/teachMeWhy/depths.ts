import type { Depth } from "../../../shared/teachMeWhy/explanationTypes";

/** The names a participant sees, in order */
export const DEPTH_CHOICES: readonly { depth: Depth; name: string }[] = [
  { depth: 1, name: "Quick" },
  { depth: 2, name: "Why it matters" },
  { depth: 3, name: "The idea behind it" }
];

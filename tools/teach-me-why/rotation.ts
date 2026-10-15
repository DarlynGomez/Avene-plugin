/** The fact each row must be built on, set by hand on 2026-10-15 so no two unknown keys share one */
export const ROTATION: Readonly<Record<string, string>> = {
  "unknown:high:normal:2": "F16",
  "unknown:high:large:2": "F20",
  "unknown:low:large:2": "F15",
  "unknown:medium:normal:3": "F02",
  "unknown:low:large:3": "F24"
};

/** The role server and its limits, data and not code. S29 freezes cropContext and the final image cap */
export const ROLE_SERVER = {
  /** localhost and not an address, the manifest does not accept one */
  baseUrl: "http://localhost:8750",
  /** Longer than the server's live timeout so the server answers first */
  liveTimeoutMs: 13000,
  precomputeTimeoutMs: 60000,
  /** What the model is shown, the text alone or its small parent frame */
  cropContext: "node" as "node" | "parent",
  cropParentMaxPx: 400,
  maxImageSide: 1024,
  /** The text must be at least this tall as sent, font size times export scale */
  minTextPx: 14,
  /** A precompute item that is still rate limited after this many tries is left for the next run */
  precomputeMaxAttempts: 5,
  backoffBaseMs: 2000,
  backoffCapMs: 60000
} as const;

export const ROLE_DATA_KEY = "cadt.role.v1";
export const ROLE_RUN_KEY = "cadt.roles.run.v1";

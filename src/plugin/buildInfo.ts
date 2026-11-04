declare const __CADT_BUILD__:
  { commit: string; dirty: boolean | null; builtAt: string } | undefined;

/** Set when the sandbox bundle is built, so a report can say exactly which build ran */
export const BUILD_INFO =
  typeof __CADT_BUILD__ === "undefined"
    ? { commit: "unknown", dirty: null, builtAt: "unknown" }
    : __CADT_BUILD__;

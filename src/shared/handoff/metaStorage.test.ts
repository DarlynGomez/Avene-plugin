import { describe, expect, it } from "vitest";

import { META_LONG_MAX_CHARS, META_SHORT_MAX_CHARS } from "./limits";
import { cleanMeta, parseMeta, pruneMeta, serializeMeta, setMeta } from "./metaStorage";
import type { HandoffItemMeta } from "./types";

const SIG = "#9A9A9A|#FFFFFF|unbound|4.5";
const FULL: HandoffItemMeta = {
  signOff: "signed",
  leaveOut: true,
  revisitTrigger: "Before launch",
  mitigation: "Same offer in the summary",
  decidedBy: "Sam Lee",
  signedBy: "Jo PM",
  signedAt: "2026-10-28T09:00:00Z"
};

describe("handoff meta", () => {
  it("round trips every field", () => {
    expect(parseMeta(serializeMeta({ [SIG]: FULL }))).toEqual({ [SIG]: FULL });
  });

  it("drops empty fields and entries that hold nothing", () => {
    const meta = { signOff: "needs", leaveOut: false, mitigation: "  ", decidedBy: "" };
    expect(cleanMeta({ [SIG]: meta })).toEqual({});
    expect(serializeMeta({ [SIG]: meta })).toBe("");
    const kept = cleanMeta({ [SIG]: { ...meta, mitigation: "Ok" } });
    expect(kept[SIG]).toEqual({ signOff: "needs", leaveOut: false, mitigation: "Ok" });
  });

  it("cuts long and short fields at their caps", () => {
    const kept = cleanMeta({
      [SIG]: {
        ...FULL,
        mitigation: "m".repeat(META_LONG_MAX_CHARS + 9),
        decidedBy: "d".repeat(META_SHORT_MAX_CHARS + 9)
      }
    })[SIG];
    expect(kept.mitigation).toHaveLength(META_LONG_MAX_CHARS);
    expect(kept.decidedBy).toHaveLength(META_SHORT_MAX_CHARS);
  });

  it("rejects a wrong sign-off value or a missing leave-out flag", () => {
    expect(cleanMeta({ [SIG]: { ...FULL, signOff: "maybe" } })).toEqual({});
    expect(cleanMeta({ [SIG]: { ...FULL, leaveOut: "no" } })).toEqual({});
    expect(parseMeta("{broken")).toEqual({});
    expect(parseMeta("[]")).toEqual({});
  });

  it("sets one signature and removes it when it goes back to the default", () => {
    const map = setMeta({}, SIG, FULL);
    expect(map[SIG]).toEqual(FULL);
    expect(setMeta(map, SIG, { signOff: "needs", leaveOut: false })).toEqual({});
  });

  it("prunes signatures that are not live", () => {
    const map = { [SIG]: FULL, other: { ...FULL } };
    expect(Object.keys(pruneMeta(map, new Set([SIG])))).toEqual([SIG]);
    expect(pruneMeta(map, new Set())).toEqual({});
  });
});

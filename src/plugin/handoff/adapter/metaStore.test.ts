import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { META_LONG_MAX_CHARS } from "../../../shared/handoff/limits";
import type { HandoffMetaMap } from "../../../shared/handoff/metaStorage";
import type { HandoffItemMeta } from "../../../shared/handoff/types";
import { buildTree } from "../../roles/testing/fakeFigma";
import { KEY_HANDOFF_META } from "../handoffKeys";
import { loadHandoffMeta, saveHandoffMeta } from "./metaStore";

const SIG = "#9A9A9A|#FFFFFF|unbound|4.5";
const OTHER = "#777777|#FFFFFF|unbound|4.5";
const signed: HandoffItemMeta = {
  signOff: "signed",
  leaveOut: false,
  signedBy: "Jo PM",
  signedAt: "2026-10-28T09:00:00Z",
  mitigation: "Same offer in the summary"
};

beforeEach(() => void buildTree());
afterEach(() => vi.unstubAllGlobals());

describe("handoff meta store", () => {
  it("round trips through the file", () => {
    expect(loadHandoffMeta()).toEqual({});
    const result = saveHandoffMeta({ [SIG]: signed });
    expect(result.saved).toBe(true);
    expect(loadHandoffMeta()).toEqual({ [SIG]: signed });
  });

  it("prunes signatures that are not live when the panel says which are", () => {
    saveHandoffMeta({ [SIG]: signed, [OTHER]: { ...signed, leaveOut: true } });
    const result = saveHandoffMeta(loadHandoffMeta(), new Set([OTHER]));
    expect(Object.keys(result.map)).toEqual([OTHER]);
    expect(Object.keys(loadHandoffMeta())).toEqual([OTHER]);
  });

  it("keeps stale entries when no live set is given", () => {
    saveHandoffMeta({ [SIG]: signed });
    expect(Object.keys(saveHandoffMeta(loadHandoffMeta()).map)).toEqual([SIG]);
  });

  it("clears the entry when everything goes back to the default", () => {
    saveHandoffMeta({ [SIG]: signed });
    saveHandoffMeta({ [SIG]: { signOff: "needs", leaveOut: false } });
    expect(figma.root.getPluginData(KEY_HANDOFF_META)).toBe("");
  });

  it("refuses a map over the size guard and keeps what was saved", () => {
    saveHandoffMeta({ [SIG]: signed });
    const wide = "\u{10000}".repeat(META_LONG_MAX_CHARS);
    const huge = Object.fromEntries(
      Array.from({ length: 8 }, (_, i) => [
        `sig${i}`,
        { signOff: "needs", leaveOut: false, mitigation: wide, revisitTrigger: wide }
      ])
    );
    const result = saveHandoffMeta(huge as unknown as HandoffMetaMap);
    expect(result.saved).toBe(false);
    expect(result.map).toEqual({ [SIG]: signed });
    expect(loadHandoffMeta()).toEqual({ [SIG]: signed });
  });

  it("reports a platform failure without throwing", () => {
    (figma.root as unknown as { setPluginData: () => void }).setPluginData = () => {
      throw new Error("no write");
    };
    expect(saveHandoffMeta({ [SIG]: signed })).toMatchObject({ saved: false, error: "no write" });
  });
});

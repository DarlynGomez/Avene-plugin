import { describe, expect, it } from "vitest";

import { isHandoffUiMessage } from "./handoffMessages";

const SIG = "#9A9A9A|#FFFFFF|unbound|4.5";
const META = { signOff: "signed", leaveOut: false, signedBy: "Jo" };

describe("isHandoffUiMessage", () => {
  it("accepts the four messages with a good shape", () => {
    expect(isHandoffUiMessage({ type: "HANDOFF_DATA_REQUEST" })).toBe(true);
    expect(isHandoffUiMessage({ type: "HANDOFF_NOTES_SET", nodeId: "1:2", notes: [] })).toBe(true);
    expect(isHandoffUiMessage({ type: "HANDOFF_META_SET", signature: SIG, meta: META })).toBe(true);
    expect(
      isHandoffUiMessage({ type: "HANDOFF_META_SET", signature: SIG, meta: META, live: [SIG] })
    ).toBe(true);
    expect(isHandoffUiMessage({ type: "HANDOFF_FILE_URL_SET", url: "" })).toBe(true);
  });

  it("refuses a meta write without a signature the panel worked out", () => {
    for (const signature of [undefined, "", "not a signature", 7]) {
      expect(isHandoffUiMessage({ type: "HANDOFF_META_SET", signature, meta: META })).toBe(false);
    }
  });

  it("refuses a bad meta, a bad live list and other shapes", () => {
    expect(
      isHandoffUiMessage({ type: "HANDOFF_META_SET", signature: SIG, meta: { signOff: "x" } })
    ).toBe(false);
    expect(
      isHandoffUiMessage({ type: "HANDOFF_META_SET", signature: SIG, meta: META, live: [1] })
    ).toBe(false);
    expect(isHandoffUiMessage({ type: "HANDOFF_NOTES_SET", nodeId: 3, notes: [] })).toBe(false);
    expect(isHandoffUiMessage({ type: "HANDOFF_NOTES_SET", nodeId: "1:2" })).toBe(false);
    expect(isHandoffUiMessage({ type: "HANDOFF_FILE_URL_SET" })).toBe(false);
    expect(isHandoffUiMessage({ type: "ROLE_QUERY", nodeId: "1:1" })).toBe(false);
    expect(isHandoffUiMessage(null)).toBe(false);
    expect(isHandoffUiMessage("HANDOFF_DATA_REQUEST")).toBe(false);
  });
});

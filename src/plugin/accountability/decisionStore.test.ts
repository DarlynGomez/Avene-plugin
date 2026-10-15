import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RootDecision } from "../../shared/grouping/groupingTypes";
import { STORAGE_KEY_DECISIONS } from "../storage/storageKeys";
import { loadDecisions, recordDecision, saveDecisions } from "./decisionStore";

const SIGNATURE = "#9CB5B1|#FFFFFF|sage/muted|4.5";
const DECISION: RootDecision = {
  signature: SIGNATURE,
  reason: "Brand color required by guidelines; tracked for the next brand review",
  recordedAt: "2026-09-08T00:00:00.000Z",
  severityAtDecision: "high"
};

function persistedFieldsOf(decision: RootDecision) {
  const { reason, recordedAt, severityAtDecision } = decision;
  return { reason, recordedAt, severityAtDecision };
}

describe("loadDecisions", () => {
  const getPluginData = vi.fn();

  beforeEach(() => {
    getPluginData.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("figma", { root: { getPluginData } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns an empty record when nothing is stored", () => {
    getPluginData.mockReturnValue("");
    expect(loadDecisions()).toEqual({});
  });

  it("returns an empty record and logs when the stored value is not valid JSON", () => {
    getPluginData.mockReturnValue("{not json");
    expect(loadDecisions()).toEqual({});
    expect(console.error).toHaveBeenCalled();
  });

  it("reconstructs the signature from the map key rather than storing it redundantly", () => {
    getPluginData.mockReturnValue(JSON.stringify({ [SIGNATURE]: persistedFieldsOf(DECISION) }));
    expect(loadDecisions()).toEqual({ [SIGNATURE]: DECISION });
  });

  it("drops an entry that fails schema validation without discarding the rest", () => {
    getPluginData.mockReturnValue(
      JSON.stringify({
        [SIGNATURE]: persistedFieldsOf(DECISION),
        malformed: { reason: "" }
      })
    );
    expect(loadDecisions()).toEqual({ [SIGNATURE]: DECISION });
  });

  it("does not prune anything: a decision has no node to check against", () => {
    // figma.getNodeByIdAsync is not stubbed, so any call to it would throw
    getPluginData.mockReturnValue(JSON.stringify({ [SIGNATURE]: persistedFieldsOf(DECISION) }));
    expect(loadDecisions()).toEqual({ [SIGNATURE]: DECISION });
  });
});

describe("saveDecisions", () => {
  const setPluginData = vi.fn();

  beforeEach(() => {
    setPluginData.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("figma", { root: { setPluginData } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("writes only section 3.4's fields, not the signature", () => {
    const result = saveDecisions({ [SIGNATURE]: DECISION });

    expect(setPluginData).toHaveBeenCalledWith(
      STORAGE_KEY_DECISIONS,
      JSON.stringify({ [SIGNATURE]: persistedFieldsOf(DECISION) })
    );
    expect(result).toEqual({ saved: true });
  });

  it("reports the failure reason rather than throwing when the write is rejected", () => {
    setPluginData.mockImplementation(() => {
      throw new Error("Cannot write to internal and read-only nodes");
    });

    const result = saveDecisions({});
    expect(result).toEqual({ saved: false, error: "Cannot write to internal and read-only nodes" });
    expect(console.error).toHaveBeenCalled();
  });
});

describe("recordDecision", () => {
  it("adds a new decision under its signature", () => {
    const updated = recordDecision({}, DECISION);
    expect(updated).toEqual({ [SIGNATURE]: DECISION });
  });

  it("overwrites a prior decision recorded at the same signature", () => {
    const revised: RootDecision = { ...DECISION, reason: "Reconsidered after a brand review" };
    const updated = recordDecision({ [SIGNATURE]: DECISION }, revised);
    expect(updated).toEqual({ [SIGNATURE]: revised });
  });
});

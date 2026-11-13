import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Issue } from "../../shared/issues/issueTypes";
import { loadIssues, loadRawIssues, saveIssues } from "./issueStore";
import { STORAGE_KEY_ISSUES } from "../storage/storageKeys";

const ALIVE: Issue = {
  id: "contrast:1:1",
  ruleId: "contrast",
  nodeId: "1:1",
  state: "deferred",
  severityAtLastDetection: "high",
  encounterCount: 2,
  lastDetectedAt: "2026-09-08T00:00:00.000Z"
};

const DEAD: Issue = { ...ALIVE, id: "contrast:1:2", nodeId: "1:2" };

/** Stored shape only, rule id and node id come from the map key */
function persistedFieldsOf(issue: Issue) {
  const { state, severityAtLastDetection, encounterCount, lastDetectedAt } = issue;
  return { state, severityAtLastDetection, encounterCount, lastDetectedAt };
}

describe("loadIssues", () => {
  const getPluginData = vi.fn();
  const setPluginData = vi.fn();
  const getNodeByIdAsync = vi.fn();

  beforeEach(() => {
    getPluginData.mockReset();
    setPluginData.mockReset();
    getNodeByIdAsync.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("figma", { root: { getPluginData, setPluginData }, getNodeByIdAsync });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns an empty record when nothing is stored", async () => {
    getPluginData.mockReturnValue("");
    expect(await loadIssues()).toEqual({});
  });

  it("returns an empty record and logs when the stored value is not valid JSON", async () => {
    getPluginData.mockReturnValue("{not json");
    expect(await loadIssues()).toEqual({});
    expect(console.error).toHaveBeenCalled();
  });

  it("reconstructs ruleId and nodeId from the map key rather than storing them redundantly", async () => {
    getPluginData.mockReturnValue(JSON.stringify({ [ALIVE.id]: persistedFieldsOf(ALIVE) }));
    getNodeByIdAsync.mockResolvedValue({ id: "1:1" });

    expect(await loadIssues()).toEqual({ [ALIVE.id]: ALIVE });
  });

  it("drops an entry that fails schema validation without discarding the rest", async () => {
    getPluginData.mockReturnValue(
      JSON.stringify({ [ALIVE.id]: persistedFieldsOf(ALIVE), malformed: { state: "bogus" } })
    );
    getNodeByIdAsync.mockResolvedValue({ id: "1:1" });

    expect(await loadIssues()).toEqual({ [ALIVE.id]: ALIVE });
  });

  it("drops an entry whose key is not a parseable issue id", async () => {
    getPluginData.mockReturnValue(JSON.stringify({ "not-an-issue-id": persistedFieldsOf(ALIVE) }));

    expect(await loadIssues()).toEqual({});
  });

  it("prunes an entry whose node no longer exists in the file", async () => {
    getPluginData.mockReturnValue(
      JSON.stringify({
        [ALIVE.id]: persistedFieldsOf(ALIVE),
        [DEAD.id]: persistedFieldsOf(DEAD)
      })
    );
    getNodeByIdAsync.mockImplementation(async (nodeId: string) =>
      nodeId === ALIVE.nodeId ? { id: nodeId } : null
    );

    expect(await loadIssues()).toEqual({ [ALIVE.id]: ALIVE });
  });
});

describe("loadRawIssues", () => {
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

  it("does not prune an entry whose node no longer resolves, unlike loadIssues", () => {
    getPluginData.mockReturnValue(
      JSON.stringify({ [ALIVE.id]: persistedFieldsOf(ALIVE), [DEAD.id]: persistedFieldsOf(DEAD) })
    );
    // figma.getNodeByIdAsync is not stubbed, so any call to it would throw
    expect(loadRawIssues()).toEqual({ [ALIVE.id]: ALIVE, [DEAD.id]: DEAD });
  });

  it("still drops entries that fail schema validation or key parsing", () => {
    getPluginData.mockReturnValue(
      JSON.stringify({
        [ALIVE.id]: persistedFieldsOf(ALIVE),
        malformed: { state: "bogus" },
        "not-an-issue-id": persistedFieldsOf(DEAD)
      })
    );
    expect(loadRawIssues()).toEqual({ [ALIVE.id]: ALIVE });
  });
});

describe("saveIssues", () => {
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

  it("writes only section 5.5's fields, not id, ruleId, or nodeId", () => {
    const result = saveIssues({ [ALIVE.id]: ALIVE });

    expect(setPluginData).toHaveBeenCalledWith(
      STORAGE_KEY_ISSUES,
      JSON.stringify({ [ALIVE.id]: persistedFieldsOf(ALIVE) })
    );
    expect(result).toEqual({ saved: true });
  });

  it("includes the ignore fields only when present", () => {
    const ignored: Issue = {
      ...ALIVE,
      state: "ignored",
      ignoredReason: "Client insisted on the brand color",
      ignoredAt: "2026-09-09T00:00:00.000Z",
      severityAtIgnore: "high",
      changedSinceIgnore: false
    };

    saveIssues({ [ignored.id]: ignored });
    const written = JSON.parse(setPluginData.mock.calls[0][1]);

    expect(written[ignored.id]).toEqual({
      state: "ignored",
      severityAtLastDetection: "high",
      encounterCount: 2,
      lastDetectedAt: "2026-09-08T00:00:00.000Z",
      ignoredReason: "Client insisted on the brand color",
      ignoredAt: "2026-09-09T00:00:00.000Z",
      severityAtIgnore: "high",
      changedSinceIgnore: false
    });
    expect(written[ignored.id]).not.toHaveProperty("id");
    expect(written[ignored.id]).not.toHaveProperty("ruleId");
    expect(written[ignored.id]).not.toHaveProperty("nodeId");
  });

  it("writes the time an issue was put off, and reads it back", () => {
    const deferred: Issue = { ...ALIVE, state: "deferred", deferredAt: "2026-11-13T10:00:00.000Z" };
    saveIssues({ [deferred.id]: deferred });
    const written = JSON.parse(setPluginData.mock.calls[0][1]);
    expect(written[deferred.id].deferredAt).toBe("2026-11-13T10:00:00.000Z");
  });

  it("reports the failure reason rather than throwing when the write is rejected", () => {
    setPluginData.mockImplementation(() => {
      throw new Error("Cannot write to internal and read-only nodes");
    });

    const result = saveIssues({});
    expect(result).toEqual({ saved: false, error: "Cannot write to internal and read-only nodes" });
    expect(console.error).toHaveBeenCalled();
  });
});

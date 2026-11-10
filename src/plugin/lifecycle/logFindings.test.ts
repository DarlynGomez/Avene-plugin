import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Finding } from "../../shared/issues/issueTypes";
import { LIVE_CTX, sessionFor } from "../../shared/study/studyEventFixtures";
import { saveStudySession } from "../study/adapter/studySessionStore";
import { logFindings } from "./logFindings";

let store: Map<string, string>;
let log: ReturnType<typeof vi.spyOn>;

const finding: Finding = {
  ruleId: "unknown-rule",
  nodeId: "1:2",
  severity: "high",
  evidence: { note: "plain" }
};

beforeEach(() => {
  store = new Map();
  vi.stubGlobal("figma", {
    root: {
      getPluginData: (key: string) => store.get(key) ?? "",
      setPluginData: (key: string, value: string) => void store.set(key, value)
    }
  });
  log = vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("logFindings", () => {
  it("prints one line per finding and a count outside a study session", () => {
    logFindings("scan", new Set(["1:2"]), [finding]);

    expect(log).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenLastCalledWith("[CADT] scan: 1 finding(s) across 1 node(s)");
  });

  it("prints nothing at all while a study session is active, not even the count", () => {
    saveStudySession(sessionFor(LIVE_CTX));

    logFindings("scan", new Set(["1:2"]), [finding]);
    logFindings("scan", new Set(), []);

    expect(log).not.toHaveBeenCalled();
  });

  it("prints again once study mode has been exited", () => {
    saveStudySession({ ...sessionFor(LIVE_CTX), exitedAt: "2026-10-11T10:00:00.000Z" });

    logFindings("scan", new Set(["1:2"]), []);

    expect(log).toHaveBeenCalledTimes(1);
  });
});

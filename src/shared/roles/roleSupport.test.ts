import { describe, expect, it } from "vitest";
import { backoffMs } from "./roleBackoff";
import { toInstanceRoles } from "./lookupRole";
import { isRolePluginMessage, isRoleUiMessage } from "./roleMessages";
import { reportCsv } from "./roleReport";
import { RoleServerSession } from "./roleServerSession";
import { buildExplanationKey } from "../teachMeWhy/explanationKey";
import type { Root } from "../grouping/groupingTypes";

describe("backoffMs", () => {
  it("doubles with each try, up to the cap, with jitter between a half and the whole", () => {
    expect(backoffMs(0, null, () => 1)).toBe(2000);
    expect(backoffMs(1, null, () => 1)).toBe(4000);
    expect(backoffMs(2, null, () => 1)).toBe(8000);
    expect(backoffMs(2, null, () => 0)).toBe(4000);
    expect(backoffMs(10, null, () => 1)).toBe(60000);
    expect(backoffMs(10, null, () => 0)).toBe(30000);
  });
  it("obeys a Retry-After, up to the cap", () => {
    expect(backoffMs(0, 7, () => 0.5)).toBe(7000);
    expect(backoffMs(3, 0, () => 0.5)).toBe(0);
    expect(backoffMs(0, 600, () => 0.5)).toBe(60000);
  });
  it("ignores a Retry-After that is not a number", () => {
    expect(backoffMs(0, Number.NaN, () => 1)).toBe(2000);
    expect(backoffMs(0, -3, () => 1)).toBe(2000);
  });
});

describe("RoleServerSession", () => {
  it("asks about a layer once, and stops for good after a transport failure", () => {
    const session = new RoleServerSession();
    expect(session.shouldAsk("a")).toBe(true);
    expect(session.shouldAsk("a")).toBe(false);
    expect(session.unavailable).toBe(false);
    session.markTransportFailure();
    expect(session.unavailable).toBe(true);
    expect(session.shouldAsk("b")).toBe(false);
  });
});

describe("toInstanceRoles", () => {
  it("puts the answer first, then the rule, and reads unsure as unknown", () => {
    expect(toInstanceRoles("caption", "label")).toEqual({
      confirmed: "label",
      ruleDecided: "caption"
    });
    expect(toInstanceRoles("caption", null)).toEqual({ confirmed: null, ruleDecided: "caption" });
    expect(toInstanceRoles(null, "unsure")).toEqual({ confirmed: "unknown", ruleDecided: null });
    expect(toInstanceRoles("unsure", null)).toEqual({ confirmed: null, ruleDecided: null });
  });
  it("changes the explanation key when a role is confirmed", () => {
    const root = {
      representativeIssueId: "i1",
      requiredRatio: 4.5,
      instances: [{ issueId: "i1", nodeId: "n1", severity: "high" }]
    } as unknown as Root;
    const key = (
      rule: Parameters<typeof toInstanceRoles>[0],
      answer: Parameters<typeof toInstanceRoles>[1]
    ) => buildExplanationKey(root, 2, () => toInstanceRoles(rule, answer)).role;
    expect(key(null, null)).toBe("unknown");
    expect(key("caption", null)).toBe("caption");
    expect(key("caption", "label")).toBe("label");
    expect(key(null, "button text")).toBe("button text");
    expect(key("caption", "unsure")).toBe("unknown");
  });
});

describe("message guards", () => {
  it("accept the role messages and refuse a label outside the list or a bad response", () => {
    expect(isRoleUiMessage({ type: "ROLE_QUERY", nodeId: "1:1" })).toBe(true);
    expect(
      isRoleUiMessage({ type: "ROLE_ANSWER", nodeId: "1:1", role: "caption", response: "changed" })
    ).toBe(true);
    expect(
      isRoleUiMessage({ type: "ROLE_ANSWER", nodeId: "1:1", role: "banner", response: "changed" })
    ).toBe(false);
    expect(
      isRoleUiMessage({ type: "ROLE_ANSWER", nodeId: "1:1", role: "caption", response: "maybe" })
    ).toBe(false);
    expect(
      isRoleUiMessage({ type: "ROLE_SERVER_RESULT", nodeId: "1:1", reply: { label: "x" } })
    ).toBe(false);
    expect(isRoleUiMessage({ type: "ROLE_PRECOMPUTE_SUBSCRIBE" })).toBe(true);
    expect(
      isRoleUiMessage({
        type: "ROLE_PRECOMPUTE_RESULT",
        nodeId: "1:1",
        reply: null,
        failure: "timeout"
      })
    ).toBe(true);
    expect(isRoleUiMessage(null)).toBe(false);
    expect(isRolePluginMessage({ type: "ROLE_STATE" })).toBe(true);
    expect(isRolePluginMessage({ type: "ISSUES_UPDATED" })).toBe(false);
  });
});

describe("reportCsv", () => {
  it("quotes a cell that holds a comma or a quote", () => {
    const csv = reportCsv([
      {
        screen: "A1",
        layerName: 'say "hi", you',
        nodeId: "1:1",
        by: "rule",
        label: "caption",
        reasonOrFailure: "N3",
        reviewed: true
      }
    ]);
    expect(csv.split("\n")[1]).toBe('A1,"say ""hi"", you",1:1,rule,caption,N3,yes');
  });
});

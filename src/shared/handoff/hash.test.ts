import { describe, expect, it } from "vitest";

import { buildDoc } from "./buildDoc";
import { DECISION, finding, ignoredFinding, input } from "./handoffFixtures";
import { findingsHash } from "./hash";

describe("findingsHash", () => {
  it("is eight hex digits and stable for the same table in any key order", () => {
    const a = findingsHash({ r1: "2.8", q1: "4.5" });
    expect(a).toMatch(/^[0-9a-f]{8}$/);
    expect(findingsHash({ q1: "4.5", r1: "2.8" })).toBe(a);
    expect(findingsHash({ r1: "2.8", q1: "4.5" })).toBe(a);
  });

  it("changes when a value or an id changes", () => {
    const base = findingsHash({ r1: "2.8" });
    expect(findingsHash({ r1: "2.9" })).not.toBe(base);
    expect(findingsHash({ r2: "2.8" })).not.toBe(base);
    expect(findingsHash({})).not.toBe(base);
  });

  it("ignores link slots so pasting an address keeps the hash", () => {
    expect(findingsHash({ r1: "2.8", k1: "https://a" })).toBe(findingsHash({ r1: "2.8" }));
  });

  it("is the same for the same findings and different when a ratio moves", () => {
    const one = buildDoc(input({ findings: [finding()] })).hash;
    expect(buildDoc(input({ findings: [finding()] })).hash).toBe(one);
    expect(buildDoc(input({ findings: [finding({ measuredRatio: 3.1 })] })).hash).not.toBe(one);
  });
});

describe("what each hash covers", () => {
  const SIG = DECISION.signature;
  const base = (over = {}) =>
    input({ findings: [ignoredFinding()], decisions: { [SIG]: DECISION }, ...over });
  const docOf = (over = {}) => buildDoc(base(over));

  it("both change with a left-as-is reason and with leaving an item out", () => {
    const a = docOf();
    const reason = docOf({ decisions: { [SIG]: { ...DECISION, reason: "Another reason" } } });
    const left = docOf({ meta: { [SIG]: { signOff: "needs", leaveOut: true } } });
    for (const other of [reason, left]) {
      expect(other.hash).not.toBe(a.hash);
      expect(other.structureHash).not.toBe(a.structureHash);
    }
  });

  it("both see a sign-off, through the waiting count", () => {
    const a = docOf();
    const signed = docOf({ meta: { [SIG]: { signOff: "signed", leaveOut: false } } });
    expect(signed.hash).not.toBe(a.hash);
    expect(signed.structureHash).not.toBe(a.structureHash);
  });

  it("only the structure hash sees which item is signed, and a worse severity", () => {
    const two = [
      ignoredFinding(),
      ignoredFinding({ issueId: "c3", nodeId: "3:1", foregroundHex: "#C00000" })
    ];
    const second = "#C00000|#FFFFFF|unbound|4.5";
    const decisions = { [SIG]: DECISION, [second]: { ...DECISION, signature: second } };
    const signedFirst = buildDoc(
      input({ findings: two, decisions, meta: { [SIG]: { signOff: "signed", leaveOut: false } } })
    );
    const signedSecond = buildDoc(
      input({
        findings: two,
        decisions,
        meta: { [second]: { signOff: "signed", leaveOut: false } }
      })
    );
    expect(signedSecond.hash).toBe(signedFirst.hash);
    expect(signedSecond.structureHash).not.toBe(signedFirst.structureHash);

    const worse = buildDoc(base({ findings: [ignoredFinding({ changedSinceIgnore: true })] }));
    expect(worse.hash).toBe(docOf().hash);
    expect(worse.structureHash).not.toBe(docOf().structureHash);
  });

  it("a pasted address leaves the findings hash alone and changes the structure", () => {
    const a = docOf();
    const linked = buildDoc(
      base({ findings: [ignoredFinding({ link: "https://www.figma.com/design/K/F?node-id=2-1" })] })
    );
    expect(linked.hash).toBe(a.hash);
    expect(linked.structureHash).not.toBe(a.structureHash);
    expect(docOf().structureHash).toBe(a.structureHash);
  });
});

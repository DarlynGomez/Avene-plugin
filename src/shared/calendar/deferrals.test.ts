import { describe, expect, it } from "vitest";

import { ENTRY_VALUE_MAX_BYTES, utf8Length } from "../handoff/limits";
import {
  clearDeferrals,
  countsOf,
  deferralsFit,
  parseDeferrals,
  pruneDeferrals,
  recordDeferral,
  serializeDeferrals
} from "./deferrals";

const AT = "2026-11-03T10:00:00.000Z";

describe("recordDeferral", () => {
  it("starts at one and adds one each time", () => {
    const once = recordDeferral({}, "a", AT);
    expect(once).toEqual({ a: { count: 1, lastAt: AT } });
    const twice = recordDeferral(once, "a", "later");
    expect(twice.a).toEqual({ count: 2, lastAt: "later" });
    expect(twice).not.toBe(once);
  });

  it("counts each root alone", () => {
    const map = recordDeferral(recordDeferral({}, "a", AT), "b", AT);
    expect(countsOf(map)).toEqual({ a: 1, b: 1 });
  });
});

describe("clearing and pruning", () => {
  const map = recordDeferral(recordDeferral(recordDeferral({}, "a", AT), "b", AT), "c", AT);

  it("clears the roots named and keeps the rest", () => {
    expect(Object.keys(clearDeferrals(map, ["a", "c"]))).toEqual(["b"]);
    expect(clearDeferrals(map, [])).toEqual(map);
  });

  it("keeps only roots that are still live", () => {
    expect(Object.keys(pruneDeferrals(map, new Set(["b"])))).toEqual(["b"]);
    expect(pruneDeferrals(map, new Set())).toEqual({});
  });
});

describe("storage text", () => {
  it("round trips and is empty when nothing is counted", () => {
    const map = recordDeferral({}, "#9CB5B1|#FFFFFF|sage/muted|4.5", AT);
    expect(parseDeferrals(serializeDeferrals(map))).toEqual(map);
    expect(serializeDeferrals({})).toBe("");
  });

  it.each(["", "{broken", "[]", "4", "null"])("reads %j as nothing", (raw) => {
    expect(parseDeferrals(raw)).toEqual({});
  });

  it("drops a record that is not a count and a time", () => {
    const raw = JSON.stringify({
      good: { count: 2, lastAt: AT },
      zero: { count: 0, lastAt: AT },
      half: { count: 1.5, lastAt: AT },
      text: { count: "2", lastAt: AT },
      none: { count: 1 },
      junk: 7
    });
    expect(Object.keys(parseDeferrals(raw))).toEqual(["good"]);
  });
});

describe("size", () => {
  it("holds several hundred roots under the entry guard", () => {
    let map = {};
    for (let i = 0; i < 500; i += 1) {
      map = recordDeferral(map, `#${String(100000 + i)}|#FFFFFF|text/muted-${i}|4.5`, AT);
    }
    expect(utf8Length(serializeDeferrals(map))).toBeLessThan(ENTRY_VALUE_MAX_BYTES);
    expect(deferralsFit(map)).toBe(true);
  });

  it("says when a map is too large to keep", () => {
    let map = {};
    for (let i = 0; i < 2000; i += 1) {
      map = recordDeferral(
        map,
        `#${String(100000 + i)}|#FFFFFF|text/a-longer-token-name-${i}|4.5`,
        AT
      );
    }
    expect(deferralsFit(map)).toBe(false);
  });
});

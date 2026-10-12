import { describe, expect, it } from "vitest";

import { buildMarkerSet } from "./markerSet";
import { instance, root } from "./markerFixtures";

describe("buildMarkerSet", () => {
  it("places one marker per root on the current screen, on its first open layer", () => {
    const markers = buildMarkerSet(
      [root("r1", [instance("1:1", "A", "open", 0), instance("1:2", "A", "open", 1)])],
      "A",
      []
    );

    expect(markers).toEqual([
      {
        signature: "r1",
        screenId: "A",
        issueId: "contrast:1:1",
        nodeId: "1:1",
        label: "2.2 x2"
      }
    ]);
  });

  it("returns nothing when no screen is known", () => {
    expect(buildMarkerSet([root("r1", [instance("1:1", "A", "open", 0)])], null, [])).toEqual([]);
  });

  it("only marks the current screen", () => {
    const roots = [
      root("r1", [instance("1:1", "A", "open", 0), instance("2:1", "B", "open", 1)]),
      root("r2", [instance("3:1", "B", "open", 2)])
    ];

    expect(buildMarkerSet(roots, "A", []).map((marker) => marker.nodeId)).toEqual(["1:1"]);
    expect(buildMarkerSet(roots, "B", []).map((marker) => marker.nodeId)).toEqual(["2:1", "3:1"]);
  });

  it("marks one layer per root per screen, not one per layer", () => {
    const markers = buildMarkerSet(
      [
        root(
          "r1",
          [1, 2, 3, 4].map((n) => instance(`1:${n}`, "A", "open", n))
        )
      ],
      "A",
      []
    );

    expect(markers).toHaveLength(1);
    expect(markers[0]?.label).toBe("2.2 x4");
  });

  it("never lands on an ignored layer, even when it is first in document order", () => {
    const markers = buildMarkerSet(
      [
        root("r1", [
          instance("1:1", "A", "ignored", 0),
          instance("1:2", "A", "open", 1),
          instance("1:3", "A", "open", 2)
        ])
      ],
      "A",
      []
    );

    expect(markers[0]?.nodeId).toBe("1:2");
    expect(markers[0]?.issueId).toBe("contrast:1:2");
  });

  it("never lands on a deferred or resolved layer ahead of an eligible one", () => {
    const markers = buildMarkerSet(
      [
        root("r1", [
          instance("1:1", "A", "deferred", 0),
          instance("1:2", "A", "resolved", 1),
          instance("1:3", "A", "important", 2)
        ])
      ],
      "A",
      []
    );

    expect(markers[0]?.nodeId).toBe("1:3");
  });

  it("counts only the eligible layers on this screen in the label", () => {
    const markers = buildMarkerSet(
      [
        root("r1", [
          instance("1:1", "A", "open", 0),
          instance("1:2", "A", "important", 1),
          instance("1:3", "A", "open", 2),
          instance("1:4", "A", "ignored", 3),
          instance("1:5", "A", "deferred", 4),
          instance("2:1", "B", "open", 5)
        ])
      ],
      "A",
      []
    );

    expect(markers[0]?.label).toBe("2.2 x3");
  });

  it("puts no marker on a screen where every layer of the root is deferred or ignored", () => {
    const markers = buildMarkerSet(
      [
        root("r1", [
          instance("1:1", "A", "deferred", 0),
          instance("1:2", "A", "ignored", 1),
          instance("2:1", "B", "open", 2)
        ])
      ],
      "A",
      []
    );

    expect(markers).toEqual([]);
  });

  it("gives a deferred or decided root no marker at all", () => {
    const roots = [
      root("r1", [instance("1:1", "A", "deferred", 0)], "deferred"),
      root("r2", [instance("1:2", "A", "ignored", 1)], "decided"),
      root("r3", [instance("1:3", "A", "resolved", 2)], "decided")
    ];

    expect(buildMarkerSet(roots, "A", [])).toEqual([]);
  });

  it("prefers the layer the designer selected most recently among the eligible ones", () => {
    const roots = [
      root("r1", [
        instance("1:1", "A", "open", 0),
        instance("1:2", "A", "open", 1),
        instance("1:3", "A", "open", 2)
      ])
    ];

    expect(buildMarkerSet(roots, "A", ["1:3", "1:1"])[0]?.nodeId).toBe("1:3");
  });

  it("ignores a selected layer that is not eligible", () => {
    const roots = [
      root("r1", [instance("1:1", "A", "ignored", 0), instance("1:2", "A", "open", 1)])
    ];

    expect(buildMarkerSet(roots, "A", ["1:1"])[0]?.nodeId).toBe("1:2");
  });

  it("says Important in the label of an important root", () => {
    const markers = buildMarkerSet(
      [root("r1", [instance("1:1", "A", "important", 0)], "important")],
      "A",
      []
    );

    expect(markers[0]?.label).toBe("! 2.2");
  });

  it("keeps the order of the roots it was given", () => {
    const roots = [
      root("r2", [instance("1:2", "A", "open", 1)]),
      root("r1", [instance("1:1", "A", "open", 0)])
    ];

    expect(buildMarkerSet(roots, "A", []).map((marker) => marker.signature)).toEqual(["r2", "r1"]);
  });

  it("uses the root's required ratio and the layer's measured ratio", () => {
    const large = root("r1", [instance("1:1", "A", "open", 0, { measuredRatio: 2.9 })]);
    const markers = buildMarkerSet([{ ...large, requiredRatio: 3 }], "A", []);

    expect(markers[0]?.label).toBe("2.9");
  });
});

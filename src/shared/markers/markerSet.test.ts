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
        label: "2.2 x2",
        count: 2
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

  it("gives a decided root no marker at all", () => {
    const roots = [
      root("r2", [instance("1:2", "A", "ignored", 1)], "decided"),
      root("r3", [instance("1:3", "A", "resolved", 2)], "decided")
    ];

    expect(buildMarkerSet(roots, "A", [])).toEqual([]);
  });

  it("keeps a marker on a deferred root, flagged so it is drawn as a gray triangle", () => {
    const roots = [root("r1", [instance("1:1", "A", "deferred", 0)], "deferred")];

    const [marker] = buildMarkerSet(roots, "A", []);
    expect(marker).toMatchObject({ signature: "r1", nodeId: "1:1", deferred: true });
  });

  it("flags the marker of an important root, so it is drawn as a diamond", () => {
    const roots = [root("r1", [instance("1:1", "A", "important", 0)], "important")];
    const [marker] = buildMarkerSet(roots, "A", []);
    expect(marker).toMatchObject({ signature: "r1", important: true });
    expect(marker.deferred).toBeUndefined();
  });

  it("does not flag a marker of a root that is open", () => {
    const [marker] = buildMarkerSet([root("r1", [instance("1:1", "A", "open", 0)])], "A", []);
    expect(marker.deferred).toBeUndefined();
    expect(marker.important).toBeUndefined();
  });

  it("puts a deferred root's marker only on a deferred layer of the screen", () => {
    const roots = [
      root(
        "r1",
        [instance("1:1", "B", "deferred", 0), instance("1:2", "A", "deferred", 1)],
        "deferred"
      )
    ];
    expect(buildMarkerSet(roots, "A", []).map((m) => m.nodeId)).toEqual(["1:2"]);
    expect(buildMarkerSet(roots, "C", [])).toEqual([]);
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

  describe("a root that was clicked", () => {
    const grouped = () =>
      root("r1", [
        instance("1:1", "A", "open", 0),
        instance("1:2", "A", "open", 1),
        instance("1:3", "A", "ignored", 2),
        instance("2:1", "B", "open", 3)
      ]);

    it("has a marker on every open layer of the screen, and none on an ignored one or another screen", () => {
      const markers = buildMarkerSet([grouped()], "A", [], "r1");
      expect(markers.map((m) => m.nodeId)).toEqual(["1:1", "1:2"]);
      expect(new Set(markers.map((m) => m.signature))).toEqual(new Set(["r1"]));
      expect(markers.map((m) => m.issueId)).toEqual(["contrast:1:1", "contrast:1:2"]);
    });

    it("is one marker as before when it was not the root that was clicked", () => {
      expect(buildMarkerSet([grouped()], "A", [], "other")).toHaveLength(1);
      expect(buildMarkerSet([grouped()], "A", [])).toHaveLength(1);
    });

    it("keeps every marker of a deferred root as a deferred one", () => {
      const deferred = root(
        "r1",
        [instance("1:1", "A", "deferred", 0), instance("1:2", "A", "deferred", 1)],
        "deferred"
      );
      const markers = buildMarkerSet([deferred], "A", [], "r1");
      expect(markers).toHaveLength(2);
      expect(markers.every((m) => m.deferred === true)).toBe(true);
    });
  });

  describe("the count of a group", () => {
    it("is on every marker of a group, as the number of open layers on the screen", () => {
      const roots = [
        root("r1", [
          instance("1:1", "A", "open", 0),
          instance("1:2", "A", "open", 1),
          instance("1:3", "A", "ignored", 2),
          instance("2:1", "B", "open", 3)
        ])
      ];
      expect(buildMarkerSet(roots, "A", [])[0]).toMatchObject({ count: 2 });
      expect(buildMarkerSet(roots, "A", [], "r1").map((m) => m.count)).toEqual([2, 2]);
    });

    it("is absent for a root with one layer on the screen, even when it has others on another screen", () => {
      const roots = [
        root("r1", [instance("1:1", "A", "open", 0), instance("2:1", "B", "open", 1)])
      ];
      expect(buildMarkerSet(roots, "A", [])[0]?.count).toBeUndefined();
    });
  });
});

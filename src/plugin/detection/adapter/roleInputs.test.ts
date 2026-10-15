import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const MIXED = Symbol("figma.mixed");
const nodes = new Map<string, unknown>();

beforeEach(() => {
  nodes.clear();
  vi.stubGlobal("figma", {
    mixed: MIXED,
    getNodeByIdAsync: (id: string) => Promise.resolve(nodes.get(id) ?? null)
  });
});
afterEach(() => vi.unstubAllGlobals());

const solid = { type: "SOLID", color: { r: 0.8, g: 0.47, b: 0.19 }, visible: true, opacity: 1 };

/**
 * The shape of the real layer A1.card1.button.label in the Lakeside Cafe task file: the text "Add",
 * 14px at weight 500, in a filled frame "button" 88 by 40, in a frame "card1", in the screen "A1".
 * The positions are assumed, the screen is 390 by 844 and the button sits near its foot.
 */
function buildButton(overrides: Record<string, unknown> = {}) {
  const page = { type: "PAGE", id: "0:1", name: "Page", backgrounds: [] };
  const screen = {
    type: "FRAME",
    id: "s1",
    name: "A1",
    parent: page,
    absoluteBoundingBox: { x: 0, y: 0, width: 390, height: 844 },
    findAll: (test: (node: unknown) => boolean) => [...nodes.values()].filter(test)
  };
  const card = {
    type: "FRAME",
    id: "c1",
    name: "card1",
    parent: screen,
    width: 350,
    height: 220,
    fills: []
  };
  const button = {
    type: "FRAME",
    id: "b1",
    name: "button",
    parent: card,
    width: 88,
    height: 40,
    fills: [solid]
  };
  const text = {
    type: "TEXT",
    id: "t1",
    name: "label",
    autoRename: false,
    characters: "Add",
    fontSize: 14,
    fontWeight: 500,
    width: 21,
    visible: true,
    parent: button,
    absoluteBoundingBox: { x: 267, y: 780, width: 21, height: 17 },
    ...overrides
  };
  for (const node of [screen, card, button, text]) nodes.set((node as { id: string }).id, node);
  return { text: text as unknown as TextNode, screen, card, button };
}

describe("snapshotRoleInputs", () => {
  it("reads the real button label shape", async () => {
    const { snapshotRoleInputs } = await import("./roleInputs");
    const { text } = buildButton();
    const census = [{ fontSizePx: 14, charCount: 3 }];
    expect(await snapshotRoleInputs(text, census)).toEqual({
      fontSizePx: 14,
      fontWeight: 500,
      charCount: 3,
      wordCount: 1,
      layerName: "label",
      autoRename: false,
      parentName: "button",
      ancestorNames: ["button", "card1", "A1"],
      componentName: null,
      parentWidth: 88,
      parentHeight: 40,
      parentHasSolidFill: true,
      textWidth: 21,
      centerXFraction: (267 + 10.5) / 390,
      centerYFraction: (780 + 8.5) / 844,
      screenTextCensus: census
    });
  });

  it("counts words and characters without keeping the text", async () => {
    const { snapshotRoleInputs } = await import("./roleInputs");
    const { text } = buildButton({ characters: "  Place   your order " });
    const inputs = await snapshotRoleInputs(text, []);
    expect(inputs).toMatchObject({ charCount: 21, wordCount: 3 });
    expect(JSON.stringify(inputs)).not.toContain("order");
  });

  it("passes autoRename through, true for a layer that names itself", async () => {
    const { snapshotRoleInputs } = await import("./roleInputs");
    const { text } = buildButton({ autoRename: true, name: "Add" });
    expect(await snapshotRoleInputs(text, [])).toMatchObject({
      autoRename: true,
      layerName: "Add"
    });
  });

  it("gives nothing for a mixed size or weight", async () => {
    const { snapshotRoleInputs } = await import("./roleInputs");
    const { text } = buildButton({ fontSize: MIXED, fontWeight: MIXED });
    expect(await snapshotRoleInputs(text, [])).toMatchObject({
      fontSizePx: null,
      fontWeight: null
    });
  });

  it("stops at the screen frame and never lists more than three names", async () => {
    const { snapshotRoleInputs } = await import("./roleInputs");
    const { text, screen, card, button } = buildButton();
    const outer = {
      type: "SECTION",
      id: "o1",
      name: "Section",
      parent: { type: "PAGE", id: "0:1" }
    };
    (screen as { parent: unknown }).parent = outer;
    const deep = {
      type: "FRAME",
      id: "d1",
      name: "row",
      parent: button,
      width: 1,
      height: 1,
      fills: []
    };
    (text as unknown as { parent: unknown }).parent = deep;
    nodes.set("d1", deep);
    expect((await snapshotRoleInputs(text, [])).ancestorNames).toEqual(["row", "button", "card1"]);
    (text as unknown as { parent: unknown }).parent = card;
    expect((await snapshotRoleInputs(text, [])).ancestorNames).toEqual(["card1", "A1"]);
  });

  it("names the main component of the nearest instance, a variant with its set", async () => {
    const { snapshotRoleInputs } = await import("./roleInputs");
    const { text, button } = buildButton();
    const set = { type: "COMPONENT_SET", name: "Button" };
    const main = { type: "COMPONENT", name: "Size=Small, Kind=Primary", parent: set };
    const instance = {
      ...button,
      type: "INSTANCE",
      getMainComponentAsync: () => Promise.resolve(main)
    };
    (text as unknown as { parent: unknown }).parent = instance;
    expect((await snapshotRoleInputs(text, [])).componentName).toBe(
      "Button Size=Small, Kind=Primary"
    );
    const lone = {
      ...instance,
      getMainComponentAsync: () =>
        Promise.resolve({ type: "COMPONENT", name: "Pill", parent: null })
    };
    (text as unknown as { parent: unknown }).parent = lone;
    expect((await snapshotRoleInputs(text, [])).componentName).toBe("Pill");
    const detached = { ...instance, getMainComponentAsync: () => Promise.resolve(null) };
    (text as unknown as { parent: unknown }).parent = detached;
    expect((await snapshotRoleInputs(text, [])).componentName).toBeNull();
  });

  it("sees a solid fill only on a frame, and only a visible one", async () => {
    const { snapshotRoleInputs } = await import("./roleInputs");
    const { text, button } = buildButton();
    for (const [fills, expected] of [
      [[solid], true],
      [[], false],
      [[{ ...solid, visible: false }], false],
      [[{ ...solid, opacity: 0 }], false],
      [[{ type: "GRADIENT_LINEAR", visible: true }], false],
      [MIXED, false]
    ] as const) {
      (button as { fills: unknown }).fills = fills;
      expect((await snapshotRoleInputs(text, [])).parentHasSolidFill).toBe(expected);
    }
    (button as { type: string }).type = "GROUP";
    (button as { fills: unknown }).fills = [solid];
    expect((await snapshotRoleInputs(text, [])).parentHasSolidFill).toBe(false);
  });

  it("gives no position when the bounds are missing, and no parent for a node on the page", async () => {
    const { snapshotRoleInputs } = await import("./roleInputs");
    const { text, screen } = buildButton({ absoluteBoundingBox: null });
    expect(await snapshotRoleInputs(text, [])).toMatchObject({
      centerXFraction: null,
      centerYFraction: null
    });
    const loose = buildButton({ parent: screen.parent }).text;
    expect(await snapshotRoleInputs(loose, [])).toMatchObject({
      parentName: null,
      parentWidth: null,
      parentHeight: null,
      parentHasSolidFill: false,
      ancestorNames: []
    });
  });
});

describe("buildScreenCensus", () => {
  it("lists every visible text node on the screen, the node itself included", async () => {
    const { buildScreenCensus } = await import("./roleInputs");
    const { text, card } = buildButton();
    const other = {
      type: "TEXT",
      id: "t2",
      name: "name",
      characters: "Avocado Toast",
      fontSize: 16,
      visible: true,
      parent: card
    };
    const hidden = {
      type: "TEXT",
      id: "t3",
      name: "x",
      characters: "hidden",
      fontSize: 20,
      visible: false,
      parent: card
    };
    const mixed = {
      type: "TEXT",
      id: "t4",
      name: "y",
      characters: "mixed size",
      fontSize: MIXED,
      visible: true,
      parent: card
    };
    for (const node of [other, hidden, mixed]) nodes.set(node.id, node);
    expect(await buildScreenCensus(text)).toEqual([
      { fontSizePx: 14, charCount: 3 },
      { fontSizePx: 16, charCount: 13 },
      { fontSizePx: null, charCount: 10 }
    ]);
  });

  it("is the node alone when it sits on no screen frame", async () => {
    const { buildScreenCensus } = await import("./roleInputs");
    const { text, screen } = buildButton({ parent: { type: "PAGE", id: "0:1" } });
    expect(screen).toBeDefined();
    expect(await buildScreenCensus(text)).toEqual([{ fontSizePx: 14, charCount: 3 }]);
  });
});

import { vi } from "vitest";

export const MIXED = Symbol("figma.mixed");

type Fake = Record<string, unknown> & { id: string; parent?: unknown };

/** A plugin data store, one per node, the way the real one keeps strings under keys */
function withData<T extends Record<string, unknown>>(node: T): T {
  const data = new Map<string, string>();
  return Object.assign(node, {
    getPluginData: (key: string) => data.get(key) ?? "",
    setPluginData: (key: string, value: string) => void data.set(key, value)
  });
}

export interface Tree {
  nodes: Map<string, Fake>;
  screen: Fake;
  exports: { id: string; scale: number }[];
  /** A text layer in the screen, shaped like a layer of the Lakeside Cafe task file */
  text: (
    id: string,
    name: string,
    characters: string,
    size: number,
    weight: number,
    extra?: Record<string, unknown>
  ) => Fake;
  frame: (id: string, name: string, extra?: Record<string, unknown>) => Fake;
}

/** A page holding one screen frame, with the Figma globals the role code reads stubbed in */
export function buildTree(): Tree {
  const nodes = new Map<string, Fake>();
  const exports: { id: string; scale: number }[] = [];
  const page = withData({
    id: "0:1",
    type: "PAGE",
    name: "Page",
    backgrounds: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }]
  });
  const find = (test: (n: Fake) => boolean) => [...nodes.values()].filter(test);
  const screen = withData({
    id: "s1",
    type: "FRAME",
    name: "A1",
    parent: page,
    width: 390,
    height: 844,
    fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }],
    opacity: 1,
    blendMode: "NORMAL",
    visible: true,
    absoluteBoundingBox: { x: 0, y: 0, width: 390, height: 844 },
    findAll: (test: (n: Fake) => boolean) => find(test)
  }) as Fake;
  nodes.set("s1", screen);
  const text: Tree["text"] = (id, name, characters, fontSize, fontWeight, extra = {}) => {
    const node = withData({
      id,
      type: "TEXT",
      name,
      autoRename: false,
      characters,
      fontSize,
      fontWeight,
      fontName: { family: "Inter", style: "Regular" },
      width: Math.round(characters.length * fontSize * 0.5),
      height: Math.round(fontSize * 1.3),
      fills: [{ type: "SOLID", color: { r: 0.17, g: 0.13, b: 0.09 } }],
      opacity: 1,
      blendMode: "NORMAL",
      visible: true,
      parent: screen,
      absoluteBoundingBox: { x: 20, y: 100, width: 80, height: 20 },
      exportAsync: (options: { constraint: { value: number } }) => {
        exports.push({ id, scale: options.constraint.value });
        return Promise.resolve(new Uint8Array([137, 80, 78, 71]));
      },
      ...extra
    }) as Fake;
    nodes.set(id, node);
    return node;
  };
  const frame: Tree["frame"] = (id, name, extra = {}) => {
    const node = withData({
      id,
      type: "FRAME",
      name,
      parent: screen,
      width: 200,
      height: 100,
      fills: [],
      visible: true,
      ...extra
    }) as Fake;
    nodes.set(id, node);
    return node;
  };
  vi.stubGlobal("figma", {
    mixed: MIXED,
    root: withData({
      id: "0:0",
      type: "DOCUMENT",
      findAll: (test: (n: Fake) => boolean) => find(test)
    }),
    getNodeByIdAsync: (id: string) => Promise.resolve(nodes.get(id) ?? null),
    loadAllPagesAsync: () => Promise.resolve(),
    base64Encode: () => "iVBORw=="
  });
  return { nodes, screen, exports, text, frame };
}

/** The four texts of screen A1 that the tests share, each with the size and weight of the real layer */
export function addCafeTexts(tree: Tree) {
  return {
    title: tree.text("t1", "title", "Lakeside Café", 24, 700),
    subtitle: tree.text("t2", "subtitle", "Open until 6 pm", 14, 400),
    desc: tree.text(
      "t3",
      "desc",
      "Sourdough, avocado, lemon and a longer description for the card",
      14,
      400
    ),
    // A1.card1.price, 16px at weight 600: no rule decides it, so it is the one the model is asked about
    price: tree.text("t4", "price", "$9.50", 16, 600),
    price2: tree.text("t5", "price", "$4.75", 16, 600),
    price3: tree.text("t6", "price", "$8.25", 16, 600)
  };
}

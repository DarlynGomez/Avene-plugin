import { describe, expect, it } from "vitest";
import { dependentTextIds } from "./dependentTexts";

type Fake = Record<string, unknown> & { id: string; children?: Fake[] };
let counter = 0;
function node(
  parent: Fake | null,
  type: string,
  box: [number, number, number, number],
  extra: Record<string, unknown> = {}
): Fake {
  counter += 1;
  const [x, y, width, height] = box;
  const made: Fake = {
    id: `d:${counter}`,
    type,
    parent,
    absoluteBoundingBox: { x, y, width, height },
    ...extra
  } as Fake;
  if (type === "FRAME" || type === "GROUP" || type === "PAGE") {
    made.children = [];
    made.findAllWithCriteria = () => collect(made);
  }
  if (parent) parent.children?.push(made);
  return made;
}
function collect(root: Fake): Fake[] {
  return (root.children ?? []).flatMap((child) => [
    ...(child.type === "TEXT" ? [child] : []),
    ...collect(child)
  ]);
}
const ids = (list: string[]) => [...list].sort();
const asNode = (value: Fake) => value as unknown as SceneNode;

describe("dependentTextIds", () => {
  it("is the text itself for a text", () => {
    const page = node(null, "PAGE", [0, 0, 999, 999]);
    const text = node(page, "TEXT", [0, 0, 10, 10]);
    expect(dependentTextIds(asNode(text))).toEqual([text.id]);
  });

  it("is every text inside a frame whose fill changed", () => {
    const page = node(null, "PAGE", [0, 0, 999, 999]);
    const frame = node(page, "FRAME", [0, 0, 300, 300]);
    const inner = node(frame, "FRAME", [0, 0, 100, 100]);
    const a = node(frame, "TEXT", [10, 10, 20, 10]);
    const b = node(inner, "TEXT", [10, 10, 20, 10]);
    expect(ids(dependentTextIds(asNode(frame)))).toEqual(ids([a.id, b.id]));
  });

  it("is the text in front of a shape that overlaps it, and not text behind it or far from it", () => {
    const page = node(null, "PAGE", [0, 0, 999, 999]);
    const behind = node(page, "TEXT", [10, 10, 20, 10]);
    const rect = node(page, "RECTANGLE", [0, 0, 100, 100]);
    const front = node(page, "TEXT", [10, 10, 20, 10]);
    const far = node(page, "TEXT", [500, 500, 20, 10]);
    expect(dependentTextIds(asNode(rect))).toEqual([front.id]);
    expect([behind.id, far.id]).not.toContain(front.id);
  });

  it("includes text nested in a frame or group in front of the shape, when it overlaps", () => {
    const page = node(null, "PAGE", [0, 0, 999, 999]);
    const rect = node(page, "RECTANGLE", [0, 0, 100, 100]);
    const group = node(page, "GROUP", [0, 0, 200, 200]);
    const inside = node(group, "TEXT", [10, 10, 20, 10]);
    node(group, "TEXT", [400, 400, 20, 10]);
    expect(dependentTextIds(asNode(rect))).toEqual([inside.id]);
  });

  it("is nothing for a shape with nothing on it", () => {
    const page = node(null, "PAGE", [0, 0, 999, 999]);
    const rect = node(page, "RECTANGLE", [0, 0, 100, 100]);
    expect(dependentTextIds(asNode(rect))).toEqual([]);
  });

  it("stops at 300 so one change cannot rescan a whole file", () => {
    const page = node(null, "PAGE", [0, 0, 9999, 9999]);
    const rect = node(page, "RECTANGLE", [0, 0, 9999, 9999]);
    for (let i = 0; i < 350; i += 1) node(page, "TEXT", [i, i, 5, 5]);
    expect(dependentTextIds(asNode(rect))).toHaveLength(300);
  });
});

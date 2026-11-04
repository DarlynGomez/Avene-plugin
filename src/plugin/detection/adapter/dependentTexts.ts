/** More than this and a change touches too much to follow, the rest wait for their own change */
const MAX_TEXT_IDS = 300;

function overlaps(a: SceneNode, b: SceneNode): boolean {
  const first = a.absoluteBoundingBox;
  const second = b.absoluteBoundingBox;
  return (
    first !== null &&
    second !== null &&
    first.x < second.x + second.width &&
    second.x < first.x + first.width &&
    first.y < second.y + second.height &&
    second.y < first.y + first.height
  );
}

function textsIn(node: SceneNode): TextNode[] {
  return "findAllWithCriteria" in node ? node.findAllWithCriteria({ types: ["TEXT"] }) : [];
}

/**
 * The text layers whose background may have changed because this layer's paint did: the text inside it,
 * and the text drawn in front of it in the same parent that it overlaps, whatever it is nested in
 */
export function dependentTextIds(node: SceneNode): string[] {
  if (node.type === "TEXT") return [node.id];
  const ids = new Set<string>(textsIn(node).map((text) => text.id));
  const parent = node.parent;
  if (parent && "children" in parent) {
    const children = parent.children;
    for (
      let index = children.findIndex((c) => c.id === node.id) + 1;
      index < children.length;
      index += 1
    ) {
      const sibling = children[index];
      const candidates = sibling.type === "TEXT" ? [sibling] : textsIn(sibling);
      for (const text of candidates) {
        if (overlaps(node, text)) ids.add(text.id);
      }
      if (ids.size >= MAX_TEXT_IDS) break;
    }
  }
  return [...ids].slice(0, MAX_TEXT_IDS);
}

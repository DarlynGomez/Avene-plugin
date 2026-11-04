import type { DocSection, HandoffItem, ItemGroup } from "./types";

/** The lines of one item with the layers it covers */
export function group(lines: readonly string[], item: HandoffItem): ItemGroup {
  return { lines, nodeIds: item.instances.map((x) => x.nodeId) };
}

/** A section built from items, an empty one is left out; the lines are the groups end to end */
export function groupedSection(
  id: string,
  title: string,
  groups: readonly ItemGroup[]
): DocSection[] {
  return groups.length > 0 ? [{ id, title, lines: groups.flatMap((g) => g.lines), groups }] : [];
}

import type { Root } from "../grouping/groupingTypes";

/**
 * Which root the tab shows when it is opened from the tab bar
 * The root of a layer selected on the canvas, else the one opened most recently, else none
 * The plugin never picks one for the designer
 */
export function resolveFocusRoot(
  roots: readonly Root[],
  selectedNodeIds: ReadonlySet<string>,
  lastOpenedSignature: string | null
): Root | null {
  const selected = roots.find((root) =>
    root.instances.some((instance) => selectedNodeIds.has(instance.nodeId))
  );
  if (selected) return selected;
  return roots.find((root) => root.signature === lastOpenedSignature) ?? null;
}

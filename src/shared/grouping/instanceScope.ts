import { deriveRoots } from "./deriveRoots";
import type { Root } from "./groupingTypes";

/** An instance can be adjusted while it is still an issue */
function adjustableIds(root: Pick<Root, "instances">): Set<string> {
  return new Set(
    root.instances
      .filter((instance) => instance.state !== "resolved")
      .map((instance) => instance.issueId)
  );
}

/**
 * The checked ids that this root still holds and can still adjust
 * A fixed instance leaves its root, so a tick left on it must not reach the next Adjust
 */
export function selectionWithin(
  selected: ReadonlySet<string>,
  root: Pick<Root, "instances">
): ReadonlySet<string> {
  const held = adjustableIds(root);
  return new Set([...selected].filter((id) => held.has(id)));
}

/**
 * The root as the card showed it, limited to the instances the card held
 * A screen or severity section shows part of a root, so the full root would aim at another frame
 * Null once none of those instances remain
 */
export function narrowRoot(root: Root, issueIds: ReadonlySet<string>): Root | null {
  const kept = root.instances.filter((instance) => issueIds.has(instance.issueId));
  if (kept.length === root.instances.length) return root;
  return deriveRoots(kept)[0] ?? null;
}

/** Drops every tick its root no longer holds, the same map back when nothing changed */
export function pruneSelections(
  selected: Readonly<Record<string, ReadonlySet<string>>>,
  roots: readonly Root[]
): Readonly<Record<string, ReadonlySet<string>>> {
  const bySignature = new Map(roots.map((root) => [root.signature, root]));
  let changed = false;
  const next: Record<string, ReadonlySet<string>> = {};
  for (const [signature, ids] of Object.entries(selected)) {
    const root = bySignature.get(signature);
    const kept = root ? selectionWithin(ids, root) : new Set<string>();
    if (kept.size !== ids.size) changed = true;
    if (kept.size > 0) next[signature] = kept;
    else if (ids.size > 0) changed = true;
  }
  return changed ? next : selected;
}

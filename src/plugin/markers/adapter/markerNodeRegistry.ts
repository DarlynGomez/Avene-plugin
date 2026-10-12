/**
 * Ids of every layer CADT drew this session, kept after removal too and never cleared while it runs
 * The detection listener skips these, a delete event arrives after the layer has gone
 */
const ids = new Set<string>();

export function rememberMarkerNode(id: string): void {
  ids.add(id);
}

export function isMarkerNodeId(id: string): boolean {
  return ids.has(id);
}

/** For tests, nothing in the plugin forgets an id */
export function forgetMarkerNodes(): void {
  ids.clear();
}

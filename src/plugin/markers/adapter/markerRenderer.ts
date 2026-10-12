import { diffMarkers } from "../../../shared/markers/markerDiff";
import type { MarkerRenderer, ShowResult } from "../../../shared/markers/markerRenderer";
import type { Marker } from "../../../shared/markers/markerSet";
import {
  addMarkerAnnotation,
  isAnnotatable,
  isTaggedByAnotherUser,
  removeMarkerAnnotations,
  type AnnotatableNode
} from "./annotationWrites";
import { ensureCategory, findCategory, removeCategoryIfUnused } from "./markerCategory";
import { sweepTaggedNodes } from "./markerSweep";

export const READ_ONLY_NOTICE =
  "Markers are off because this file is view only for you. Everything else works as usual.";
export const NO_USER_NOTICE =
  "Markers are off because CADT cannot tell who you are. Re-import the plugin so it can.";

function newSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The only place that writes annotations
 * Keeps live references to every layer it annotated, as the preview does, so a close can undo
 * its writes without awaiting anything
 */
export function createMarkerRenderer(sessionId: string = newSessionId()): MarkerRenderer {
  const live = new Map<string, AnnotatableNode>();
  let shown: Marker[] = [];
  let swept = false;
  let readOnly = false;
  let noticeGiven = false;
  let lastCategory: AnnotationCategory | null = null;

  const userId = (): string | null => figma.currentUser?.id ?? null;
  const ours = (id: string) => (tag: { userId: string; sessionId: string }) =>
    tag.userId === id && tag.sessionId === sessionId;

  function refuse(reason: "read_only" | "no_user", notice: string): ShowResult {
    const say = noticeGiven ? null : notice;
    noticeGiven = true;
    return { written: false, reason, notice: say };
  }

  function removeFromLive(nodeId: string, id: string, categoryId: string | null): void {
    const node = live.get(nodeId);
    if (node) {
      removeMarkerAnnotations(node, categoryId, ours(id));
      live.delete(nodeId);
    }
  }

  async function sweepOrphans() {
    const id = userId();
    swept = true;
    return id === null
      ? { cleaned: 0, left: 0 }
      : sweepTaggedNodes(id, new Set(live.keys()), sessionId);
  }

  async function show(screenId: string, markers: readonly Marker[]): Promise<ShowResult> {
    const id = userId();
    if (id === null) return refuse("no_user", NO_USER_NOTICE);
    if (readOnly) return { written: false, reason: "read_only", notice: null };
    if (!swept) await sweepOrphans();

    const wanted = markers.filter((marker) => marker.screenId === screenId);
    const diff = diffMarkers(shown, wanted);
    if (diff.added.length === 0 && diff.removed.length === 0) return { written: true };

    const written: Marker[] = [];
    try {
      const category = diff.added.length > 0 ? await ensureCategory() : await findCategory();
      lastCategory = category ?? lastCategory;
      for (const marker of diff.removed) removeFromLive(marker.nodeId, id, category?.id ?? null);
      for (const marker of diff.added) {
        const node = await figma.getNodeByIdAsync(marker.nodeId);
        if (!category || !isAnnotatable(node) || isTaggedByAnotherUser(node, id)) continue;
        addMarkerAnnotation(node, marker.label, category.id, { userId: id, sessionId });
        live.set(node.id, node);
        written.push(marker);
      }
      shown = [...diff.unchanged, ...written];
      if (category && shown.length === 0) removeCategoryIfUnused(category);
      figma.commitUndo();
      return { written: true };
    } catch {
      // A failed write means the file cannot be written to, so undo what this call did and stop
      for (const marker of written) removeFromLive(marker.nodeId, id, lastCategory?.id ?? null);
      shown = diff.unchanged;
      readOnly = true;
      return refuse("read_only", READ_ONLY_NOTICE);
    }
  }

  async function clear(): Promise<void> {
    await show("", []);
  }

  function clearSync(): void {
    const id = userId();
    if (id === null) return;
    for (const nodeId of [...live.keys()]) removeFromLive(nodeId, id, lastCategory?.id ?? null);
    shown = [];
    if (lastCategory) removeCategoryIfUnused(lastCategory);
  }

  return { show, clear, clearSync, sweepOrphans };
}

import type { MarkerRenderer, ShowResult } from "../../../shared/markers/markerRenderer";
import type { Marker } from "../../../shared/markers/markerSet";
import type { MarkerStyle } from "../../../shared/markers/markerStyle";
import { createAnnotationBackend, type BackendResult } from "./annotationBackend";
import { sweepTaggedNodes } from "./markerSweep";
import { createShapeBackend } from "./shapeBackend";

export const READ_ONLY_NOTICE =
  "Markers are off because this file is view only for you. Everything else works as usual.";
export const NO_USER_NOTICE =
  "Markers are off because CADT cannot tell who you are. Re-import the plugin so it can.";

function newSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The only place that writes markers, in whichever style is chosen
 * Switching style removes the old style through its own path first, so two styles are never on the
 * canvas together, and one undo step covers the whole swap
 */
export function createMarkerRenderer(sessionId: string = newSessionId()): MarkerRenderer {
  const annotation = createAnnotationBackend(sessionId);
  const shapes = createShapeBackend(sessionId);
  let swept = false;
  let readOnly = false;
  let noticeGiven = false;
  let current: MarkerStyle | null = null;

  const userId = (): string | null => figma.currentUser?.id ?? null;

  function refuse(reason: "read_only" | "no_user", notice: string): ShowResult {
    const say = noticeGiven ? null : notice;
    noticeGiven = true;
    return { written: false, reason, notice: say };
  }

  function applyStyle(
    id: string,
    style: MarkerStyle,
    wanted: readonly Marker[]
  ): Promise<BackendResult> {
    return style === "annotation" ? annotation.apply(id, wanted) : shapes.apply(id, wanted, style);
  }

  async function sweepOrphans() {
    const id = userId();
    swept = true;
    return id === null
      ? { cleaned: 0, left: 0 }
      : sweepTaggedNodes(id, new Set(liveNodeIds()), sessionId);
  }

  function liveNodeIds(): ReadonlySet<string> {
    return new Set([...annotation.liveNodeIds(), ...shapes.liveNodeIds()]);
  }

  async function show(
    screenId: string,
    markers: readonly Marker[],
    style: MarkerStyle = "annotation",
    undoStep = true
  ): Promise<ShowResult> {
    const id = userId();
    if (id === null) return refuse("no_user", NO_USER_NOTICE);
    if (readOnly) return { written: false, reason: "read_only", notice: null };
    if (!swept) await sweepOrphans();

    const wanted = markers.filter((marker) => marker.screenId === screenId);
    const done: BackendResult[] = [];
    try {
      if (current !== null && current !== style) done.push(await applyStyle(id, current, []));
      current = style;
      done.push(await applyStyle(id, style, wanted));
      if (undoStep && done.some((result) => result.wrote)) figma.commitUndo();
      return { written: true };
    } catch {
      // A failed write means the file cannot be written to, so undo what this call did and stop
      for (const result of done) result.rollback();
      readOnly = true;
      return refuse("read_only", READ_ONLY_NOTICE);
    }
  }

  async function clear(): Promise<void> {
    await show("", [], current ?? "annotation");
  }

  /** The close handler, everything of both styles goes, with nothing awaited */
  function clearSync(): void {
    annotation.releaseAll();
    shapes.releaseAll(userId());
  }

  return { show, clear, clearSync, sweepOrphans, liveNodeIds };
}

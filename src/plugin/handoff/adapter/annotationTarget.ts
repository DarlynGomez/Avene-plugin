import type {
  AnnotationAction,
  AnnotationFailure,
  AnnotationPluginMessage
} from "../../../shared/handoff/alt/annotationMessages";
import { parseNodeNotes, type NodeNote } from "../../../shared/handoff/noteStorage";
import { KEY_NODE_NOTES } from "../handoffKeys";
import { canAnnotate, type AnnotatableNode } from "./altAnnotation";
import { nodeById } from "./nodeLookup";

export type Reply = Extract<AnnotationPluginMessage, { type: "HANDOFF_ANNOTATION_RESULT" }>;

export const fail = (
  action: AnnotationAction,
  nodeId: string,
  reason: AnnotationFailure,
  error?: string
): Reply => ({
  type: "HANDOFF_ANNOTATION_RESULT",
  action,
  nodeId,
  ok: false,
  reason,
  ...(error ? { error } : {})
});

export interface Target {
  node: AnnotatableNode;
  notes: NodeNote[];
  alt: NodeNote | undefined;
}

export async function load(nodeId: string): Promise<Target | AnnotationFailure> {
  const node = await nodeById(nodeId);
  if (node === null || ("removed" in node && node.removed)) return "layer-gone";
  if (!canAnnotate(node)) return "layer-type";
  const notes = parseNodeNotes(node.getPluginData(KEY_NODE_NOTES));
  return { node, notes, alt: notes.find((note) => note.category === "alt") };
}

export function message(error: unknown): string {
  return error instanceof Error && error.message ? error.message : String(error);
}

import { clearAnnotated, markAnnotated } from "../../../shared/handoff/alt/annotationFields";
import type { AnnotationAction } from "../../../shared/handoff/alt/annotationMessages";
import { annotationStatus } from "../../../shared/handoff/alt/annotationStatus";
import {
  annotationTextOf,
  isReservedAnnotationText,
  labelHash
} from "../../../shared/handoff/alt/annotationText";
import type { NodeNote } from "../../../shared/handoff/noteStorage";
import {
  appendAnnotation,
  dropAnnotation,
  findOurs,
  observe,
  replaceAnnotation
} from "./altAnnotation";
import { ensureAltCategory, findAltCategoryId } from "./altCategory";
import { fail, load, message, type Reply, type Target } from "./annotationTarget";
import { setNodeNotes } from "./notesStore";

/** Every write is one undo step, committed after the annotation and the note are both written */
async function write(
  action: AnnotationAction,
  nodeId: string,
  target: Target,
  change: (categoryId: string) => void,
  after: (notes: readonly NodeNote[]) => NodeNote[],
  categoryId: string | null
): Promise<Reply> {
  const before = target.node.annotations;
  try {
    change(categoryId ?? (await ensureAltCategory()));
  } catch (error) {
    return fail(action, nodeId, "read-only", message(error));
  }
  const saved = await setNodeNotes(nodeId, after(target.notes));
  if (!saved.saved) {
    // Nothing is left on the canvas that the note does not know about
    try {
      target.node.annotations = before;
    } catch {
      // the file turned read only between the two writes, the status will show the drift
    }
    return fail(action, nodeId, "note-not-saved", saved.error);
  }
  figma.commitUndo();
  return {
    type: "HANDOFF_ANNOTATION_RESULT",
    action,
    nodeId,
    ok: true,
    status: after === clearAnnotated ? "none" : "in-sync"
  };
}

/** Adds the one annotation for this note, only when none of ours is there */
export async function annotateNode(nodeId: string): Promise<Reply> {
  const target = await load(nodeId);
  if (typeof target === "string") return fail("annotate", nodeId, target);
  const text = annotationTextOf(target.alt);
  if (text === null) return fail("annotate", nodeId, "no-note");
  if (isReservedAnnotationText(text)) return fail("annotate", nodeId, "reserved-text");
  const categoryId = await findAltCategoryId();
  const status = annotationStatus(
    target.alt,
    observe(target.node, categoryId, target.alt?.annotatedHash)
  );
  if (status === "in-sync" || status === "out-of-date")
    return fail("annotate", nodeId, "already-annotated");
  return write(
    "annotate",
    nodeId,
    target,
    (id) => appendAnnotation(target.node, id, text),
    (notes) => markAnnotated(notes, new Date().toISOString(), labelHash(text)),
    categoryId
  );
}

/** Replaces ours in place with what the note says now, and leaves one that was edited on the canvas alone */
export async function updateAnnotation(nodeId: string): Promise<Reply> {
  const target = await load(nodeId);
  if (typeof target === "string") return fail("update", nodeId, target);
  const text = annotationTextOf(target.alt);
  if (text === null) return fail("update", nodeId, "no-note");
  if (isReservedAnnotationText(text)) return fail("update", nodeId, "reserved-text");
  const categoryId = await findAltCategoryId();
  const hash = target.alt?.annotatedHash;
  const index = categoryId !== null && hash ? findOurs(target.node, categoryId, hash) : -1;
  if (index < 0) return fail("update", nodeId, "changed-on-canvas");
  return write(
    "update",
    nodeId,
    target,
    (id) => replaceAnnotation(target.node, index, id, text),
    (notes) => markAnnotated(notes, new Date().toISOString(), labelHash(text)),
    categoryId
  );
}

/** Takes ours off the layer and forgets it; when it is already gone only the record goes, and nothing else is touched */
export async function removeAnnotation(nodeId: string): Promise<Reply> {
  const target = await load(nodeId);
  if (typeof target === "string") return fail("remove", nodeId, target);
  const categoryId = await findAltCategoryId();
  const hash = target.alt?.annotatedHash;
  const index = categoryId !== null && hash ? findOurs(target.node, categoryId, hash) : -1;
  if (index < 0) {
    const status = annotationStatus(target.alt, observe(target.node, categoryId, hash));
    if (status === "out-of-date") return fail("remove", nodeId, "changed-on-canvas");
    if (target.alt?.annotated) await setNodeNotes(nodeId, clearAnnotated(target.notes));
    return {
      type: "HANDOFF_ANNOTATION_RESULT",
      action: "remove",
      nodeId,
      ok: true,
      status: "none"
    };
  }
  return write(
    "remove",
    nodeId,
    target,
    () => dropAnnotation(target.node, index),
    clearAnnotated,
    categoryId
  );
}

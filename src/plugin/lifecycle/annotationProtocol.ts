import type {
  AnnotationPluginMessage,
  AnnotationUiMessage
} from "../../shared/handoff/alt/annotationMessages";
import {
  FEATURE_ALT_ANNOTATIONS,
  FEATURE_HANDOFF,
  annotationsAllowed
} from "../../shared/handoffFlags";
import { isStudyActive } from "../../shared/study/studyActive";
import {
  annotateNode,
  removeAnnotation,
  updateAnnotation
} from "../handoff/adapter/annotationActions";
import { annotationStatuses } from "../handoff/adapter/annotationStatuses";
import { activeStudySession } from "../study/adapter/studySessionStore";

type Reply = (message: AnnotationPluginMessage) => void;

/** The annotation flag is read first so a build with it off touches no storage, not even the session */
function open(): boolean {
  return (
    FEATURE_ALT_ANNOTATIONS &&
    annotationsAllowed(
      FEATURE_ALT_ANNOTATIONS,
      FEATURE_HANDOFF,
      isStudyActive(activeStudySession())
    )
  );
}

async function handle(message: AnnotationUiMessage, reply: Reply): Promise<void> {
  switch (message.type) {
    case "HANDOFF_ANNOTATE":
      reply(await annotateNode(message.nodeId));
      return;
    case "HANDOFF_ANNOTATION_UPDATE":
      reply(await updateAnnotation(message.nodeId));
      return;
    case "HANDOFF_ANNOTATION_REMOVE":
      reply(await removeAnnotation(message.nodeId));
      return;
    case "HANDOFF_ANNOTATION_STATUS_REQUEST":
      reply({
        type: "HANDOFF_ANNOTATION_STATUSES",
        statuses: await annotationStatuses(message.nodeIds)
      });
      return;
  }
}

/** Refuses with a typed reply unless annotations are allowed, with no read and no write */
export async function handleAnnotationMessage(
  message: AnnotationUiMessage,
  reply: Reply
): Promise<void> {
  if (!open()) {
    reply({ type: "HANDOFF_ANNOTATION_REFUSED" });
    return;
  }
  try {
    await handle(message, reply);
  } catch (error) {
    console.error("handleAnnotationMessage: an annotation message could not be handled", error);
  }
}

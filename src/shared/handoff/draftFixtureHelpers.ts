import type { AudienceDoc, DocSection } from "./types";

/** The blocks a draft is made for: everything but the fixed Not covered block */
export const draftableSectionsOf = (doc: AudienceDoc): DocSection[] =>
  doc.sections.filter((s) => s.id !== "notCovered" && s.lines.length > 0);

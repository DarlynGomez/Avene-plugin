import type { NoteCategory } from "../../shared/handoff/noteStorage";

/** What each kind of note is called in the sheet */
export const CATEGORY_NAMES: Record<NoteCategory, string> = {
  alt: "Image description (alt text)",
  heading: "Heading",
  name: "Name for a control",
  state: "A state that is missing",
  question: "A question for someone"
};

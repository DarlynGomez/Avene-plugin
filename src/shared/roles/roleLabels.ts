import type { ElementRole } from "../teachMeWhy/explanationTypes";

/** The fixed list a rule, a model or a participant chooses from, in this order */
export const ROLE_LABELS = [
  "heading",
  "body",
  "caption",
  "label",
  "button text",
  "decorative",
  "unsure"
] as const;

export type RoleLabel = (typeof ROLE_LABELS)[number];
export type DecidedRole = Exclude<RoleLabel, "unsure">;

/** What each label means, shown beside it when a participant is asked */
export const ROLE_MEANINGS: Readonly<Record<RoleLabel, string>> = {
  heading: "A title that introduces a section or a screen",
  body: "A paragraph or the main running text",
  caption: "A small note, hint or description attached to something else",
  label: "The name of a field, a tab or a tag",
  "button text": "The words on a button or a link that does something",
  decorative: "Text that is only for looks and carries no information",
  unsure: "The participant or the model could not say"
};

/** Unsure is an answer and not a role, an explanation looks it up as unknown */
export function toExplanationRole(label: RoleLabel): ElementRole {
  return label === "unsure" ? "unknown" : label;
}

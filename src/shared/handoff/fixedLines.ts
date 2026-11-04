/** Fixed text, no code path edits or drops these */
export const CRITERION = "WCAG 1.4.3";

export const CHECKS_LINE = `Checks: text contrast (${CRITERION}), design file only`;

export const NOT_COVERED_LINE =
  "Needs check: Not covered by this check: keyboard behavior, screen reader output, code order, and the quality of alt text. Some text layers may not be evaluated. Avene checks text contrast in the design file only. Test the rest on the built page.";

export const CLIENT_LINE = "Draft for the designer to send. Not a conformance statement.";

export const HIGHER_UP_LINE =
  "Whether these items affect a conformance claim depends on what the organization has claimed. Avene makes no conformance claim.";

/** The last line of a copy made before anyone has reviewed it */
export const NOT_REVIEWED_LINE = "Not yet reviewed by a person.";

export const ADVISORY_LABEL = "Inference, not a measured failure";

export const TICKET_IMPACT =
  "People with low vision, or reading in bright light, may not be able to read this text.";

export const PM_NOT_VERIFIED =
  "Needs check: Keyboard, screen reader output, code order and alt text quality are not verified. Test on the build.";

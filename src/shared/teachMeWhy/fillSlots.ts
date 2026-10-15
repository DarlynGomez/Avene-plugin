export interface SlotValues {
  measured: string;
  required: string;
}

/** What the plugin knows about one issue beyond its two ratios */
export interface IssueDetails {
  foregroundHex: string;
  backgroundHex: string;
  /** Null when the size is not known, a text that asks for it then falls back */
  fontSizePx: number | null;
  /** Null when no colour of the same hue reaches the required ratio */
  fixHex: string | null;
}

/** Measured to two decimals and required as the panel prints it, 4.5:1 and 3:1 */
export function slotValues(measuredRatio: number, requiredRatio: number): SlotValues {
  return { measured: `${measuredRatio.toFixed(2)}:1`, required: `${requiredRatio}:1` };
}

/** Whole pixels, one decimal when it is fractional */
export function formatFontSize(px: number): string {
  return `${Number.isInteger(px) ? px : px.toFixed(1)}px`;
}

function valuesFor(
  measuredRatio: number,
  requiredRatio: number,
  details?: IssueDetails
): Record<string, string | null> {
  const ratios = slotValues(measuredRatio, requiredRatio);
  return {
    measured: ratios.measured,
    required: ratios.required,
    foreground: details?.foregroundHex ?? null,
    background: details?.backgroundHex ?? null,
    fontsize: details?.fontSizePx != null ? formatFontSize(details.fontSizePx) : null,
    fix: details?.fixHex ?? null
  };
}

/** Slots in the text that have no value for this issue, such as a fix colour that cannot exist */
export function unfilledSlots(
  text: string,
  measuredRatio: number,
  requiredRatio: number,
  details?: IssueDetails
): string[] {
  const values = valuesFor(measuredRatio, requiredRatio, details);
  return Object.keys(values).filter((name) => values[name] === null && text.includes(`{${name}}`));
}

/** Puts the plugin's own values where the stored text holds a placeholder */
export function fillSlots(
  text: string,
  measuredRatio: number,
  requiredRatio: number,
  details?: IssueDetails
): string {
  const values = valuesFor(measuredRatio, requiredRatio, details);
  return Object.entries(values).reduce(
    (out, [name, value]) => (value === null ? out : out.replaceAll(`{${name}}`, value)),
    text
  );
}

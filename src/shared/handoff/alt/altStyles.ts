/** The three ways a description can be worded, chosen in the sheet and sent to the server */
export const ALT_STYLES = ["concise", "descriptive", "functional"] as const;
export type AltStyle = (typeof ALT_STYLES)[number];

export const DEFAULT_ALT_STYLE: AltStyle = "concise";

export const ALT_STYLE_LABELS: Readonly<Record<AltStyle, string>> = {
  concise: "Concise",
  descriptive: "Descriptive",
  functional: "Functional"
};

export const isAltStyle = (value: unknown): value is AltStyle =>
  ALT_STYLES.some((style) => style === value);

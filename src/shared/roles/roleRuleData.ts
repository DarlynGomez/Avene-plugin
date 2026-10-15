import type { DecidedRole } from "./roleLabels";

/** Questions and rules are data, a threshold or a word is changed here and nowhere else */
export interface NameRule {
  id: string;
  role: DecidedRole;
  patterns: readonly string[];
  /** Null means any length of text */
  maxWords: number | null;
  /** Wide reads the own name, the ancestors and the component, near reads the own name and the parent */
  reach: "wide" | "near";
  /** Reason when the own layer name matched, {name} is the name that did */
  ownReason: string;
  /** Reason when another name matched, an ancestor, a component or the parent */
  otherReason: string;
}

export const NAME_RULES: readonly NameRule[] = [
  {
    id: "N1",
    role: "button text",
    patterns: ["button", "btn", "cta"],
    maxWords: 5,
    reach: "wide",
    ownReason: 'Its layer name says it is a button: "{name}".',
    otherReason: 'It sits inside "{name}" and the text is short.'
  },
  {
    id: "N2",
    role: "decorative",
    patterns: ["watermark", "decorative", "ornament", "background text"],
    maxWords: null,
    reach: "wide",
    ownReason: 'Its layer name says it is decoration: "{name}".',
    otherReason: 'It sits inside "{name}", which says it is decoration.'
  },
  {
    id: "N3",
    role: "caption",
    patterns: ["caption", "subtitle", "hint", "helper", "footnote", "disclaimer", "legal"],
    maxWords: null,
    reach: "near",
    ownReason: 'Its layer name says it is a note: "{name}".',
    otherReason: 'It sits directly inside "{name}", which says it is a note.'
  },
  {
    id: "N4",
    role: "heading",
    patterns: ["heading", "headline", "title", "header", "h1", "h2", "h3", "h4", "h5", "h6"],
    maxWords: 12,
    reach: "near",
    ownReason: 'Its layer name says it is a heading: "{name}".',
    otherReason: 'It sits directly inside "{name}", which says it is a heading.'
  },
  {
    id: "N5",
    role: "label",
    patterns: ["label", "field", "input"],
    maxWords: 6,
    reach: "near",
    ownReason: 'Its layer name says it is a label: "{name}".',
    otherReason: 'It sits directly inside "{name}", which says it is a label.'
  }
];

export const SHAPE = {
  buttonParentMaxHeight: 72,
  buttonMaxWords: 4,
  headingBigRatio: 1.5,
  headingBigMaxWords: 10,
  boldWeight: 600,
  headingBoldRatio: 1.2,
  headingBoldMaxWords: 10,
  captionMaxRatio: 0.9,
  captionMinWords: 3,
  bodyMinRatioAbove: 0.9,
  bodyMaxRatioBelow: 1.2,
  bodyMinWords: 8,
  /** The bottom 12 percent of the screen, as a fraction of its height */
  bottomBandFrom: 0.88
} as const;

export const SHAPE_REASONS = {
  S1: "It sits in a small filled shape and is only a few words, like a button.",
  S2: "It is much larger than the main text on this screen and short.",
  S3: "It is bolder and larger than the main text on this screen and short.",
  S4: "It is smaller than the main text on this screen and more than a couple of words.",
  S4Bottom: "It is small and sits at the bottom of the screen.",
  S5: "It is the same size as the main text on this screen and runs to several words."
} as const;

export const UNDECIDED_REASONS = {
  none: "No rule decided what kind of text this is.",
  conflict: "The names on this text point to different kinds of text."
} as const;

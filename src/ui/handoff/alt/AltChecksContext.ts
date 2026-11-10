import { createContext, useContext } from "react";

import type { AnnotationStatus } from "../../../shared/handoff/alt/annotationStatus";
import type { AltCounts, AltLayerView } from "../../../shared/handoff/alt/altRoots";
import type { AiResetResult } from "../../../shared/handoff/alt/altMessages";
import type { NoteSource } from "../../../shared/handoff/noteStorage";
import { INERT_SUGGEST, type SuggestApi } from "./suggestTypes";

/** The two big sections of the Live Watch list, which are open is kept for the session and not stored */
export type SectionName = "contrast" | "alt";

export interface AltAnswer {
  text: string;
  decorative: boolean;
  source: NoteSource;
}

export interface AltSheetTarget {
  nodeId: string;
  /** Opened from Mark decorative, so the box starts ticked */
  decorative: boolean;
}

export interface AltChecksValue {
  /** False when handoff is off or a study is running, nothing below then does anything */
  available: boolean;
  annotationsOn: boolean;
  /** False until the inventory has answered once */
  ready: boolean;
  views: readonly AltLayerView[];
  counts: AltCounts;
  statuses: Readonly<Record<string, AnnotationStatus>>;
  error: string | null;
  annotationError: string | null;
  annotationBusy: boolean;
  /** Pictures flagged as important for this session, which are listed first */
  pinned: ReadonlySet<string>;
  togglePin: (imageHash: string) => void;
  sections: Readonly<Record<SectionName, boolean>>;
  toggleSection: (section: SectionName) => void;
  suggest: SuggestApi;
  sheet: AltSheetTarget | null;
  openSheet: (nodeId: string, decorative?: boolean) => void;
  closeSheet: () => void;
  /** One write for each layer named, which is one layer unless the designer asked for all of them */
  saveNote: (nodeIds: readonly string[], answer: AltAnswer) => void;
  annotate: (nodeId: string) => void;
  updateAnnotation: (nodeId: string) => void;
  removeAnnotation: (nodeId: string) => void;
  /** Development only: clears what a model wrote, and what it cleared once it has */
  resetAi: () => void;
  resetResult: AiResetResult | null;
  /** Selects and zooms through the same adapter as Show on canvas, so it is not a re-encounter */
  locate: (nodeIds: readonly string[]) => void;
}

const nothing = () => undefined;

export const INERT_ALT: AltChecksValue = {
  available: false,
  annotationsOn: false,
  ready: false,
  views: [],
  counts: { roots: 0, layers: 0, screens: 0, screenIds: [], answered: 0, decorative: 0 },
  statuses: {},
  error: null,
  annotationError: null,
  annotationBusy: false,
  pinned: new Set(),
  togglePin: nothing,
  sections: { contrast: true, alt: false },
  toggleSection: nothing,
  suggest: INERT_SUGGEST,
  sheet: null,
  openSheet: nothing,
  closeSheet: nothing,
  saveNote: nothing,
  annotate: nothing,
  updateAnnotation: nothing,
  removeAnnotation: nothing,
  resetAi: nothing,
  resetResult: null,
  locate: nothing
};

export const AltChecksContext = createContext<AltChecksValue>(INERT_ALT);

export function useAltChecks(): AltChecksValue {
  return useContext(AltChecksContext);
}

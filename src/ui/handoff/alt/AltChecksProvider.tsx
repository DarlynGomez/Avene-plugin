import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { FEATURE_ALT_SUGGEST_LIVE } from "../../../shared/handoffFlags";
import { altCounts, altLayerViews } from "../../../shared/handoff/alt/altRoots";
import { useHandoffAvailable } from "../useHandoffAvailable";
import {
  AltChecksContext,
  type AltChecksValue,
  type AltSheetTarget,
  type SectionName
} from "./AltChecksContext";
import { useAltMessages } from "./useAltMessages";
import { useAltSuggest } from "./useAltSuggest";
import { useAnnotationsAvailable } from "./useAnnotationsAvailable";

/**
 * The alt text checks for the Live Watch panel: the layers and notes, which check is chosen,
 * and the sheet that is open, the choices are kept for the session only
 */
export function AltChecksProvider({ children }: { children: ReactNode }) {
  const available = useHandoffAvailable();
  const annotationsOn = useAnnotationsAvailable();
  const messages = useAltMessages(available, annotationsOn);
  const { layers, notes, refresh } = messages;
  // The live path also needs handoff to be available, which is false in a study
  const suggest = useAltSuggest(available, available && FEATURE_ALT_SUGGEST_LIVE);
  const [pinned, setPinned] = useState<ReadonlySet<string>>(new Set());
  const [sections, setSections] = useState({ contrast: true, alt: false });
  const [sheet, setSheet] = useState<AltSheetTarget | null>(null);

  const { clear } = suggest;
  // After a reset the suggestions held in the panel go too, or they would be shown again from memory
  useEffect(() => {
    if (messages.resetResult) clear();
  }, [messages.resetResult, clear]);

  const views = useMemo(() => altLayerViews(layers ?? [], notes), [layers, notes]);
  const counts = useMemo(() => altCounts(views), [views]);

  const toggleSection = useCallback(
    (name: SectionName) => {
      setSections((previous) => ({ ...previous, [name]: !previous[name] }));
      // A look at the page on request, so opening the section is also how its list is brought up to date
      if (name === "alt" && !sections.alt) refresh();
    },
    [refresh, sections.alt]
  );
  const togglePin = useCallback(
    (hash: string) =>
      setPinned((previous) => {
        const next = new Set(previous);
        if (!next.delete(hash)) next.add(hash);
        return next;
      }),
    []
  );
  const openSheet = useCallback(
    (nodeId: string, decorative = false) => setSheet({ nodeId, decorative }),
    []
  );
  const closeSheet = useCallback(() => setSheet(null), []);

  const value: AltChecksValue = {
    available,
    annotationsOn,
    ready: layers !== null,
    views,
    counts,
    statuses: messages.statuses,
    error: messages.error,
    annotationError: messages.annotationError,
    annotationBusy: messages.annotationBusy,
    pinned,
    togglePin,
    sections,
    toggleSection,
    suggest,
    sheet,
    openSheet,
    closeSheet,
    saveNote: messages.saveNote,
    annotate: messages.annotate,
    updateAnnotation: messages.updateAnnotation,
    removeAnnotation: messages.removeAnnotation,
    resetAi: messages.resetAi,
    resetResult: messages.resetResult,
    locate: messages.locate
  };
  return <AltChecksContext.Provider value={value}>{children}</AltChecksContext.Provider>;
}

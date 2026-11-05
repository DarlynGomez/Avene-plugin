import { useCallback, useMemo, useState, type ReactNode } from "react";

import { altCounts, altLayerViews, type AltGroupBy } from "../../../shared/handoff/alt/altRoots";
import { useHandoffAvailable } from "../useHandoffAvailable";
import {
  AltChecksContext,
  type AltChecksValue,
  type AltSheetTarget,
  type CheckChoice
} from "./AltChecksContext";
import { useAltMessages } from "./useAltMessages";
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
  const [check, setCheckState] = useState<CheckChoice>("all");
  const [groupBy, setGroupBy] = useState<AltGroupBy>("root-cause");
  const [sheet, setSheet] = useState<AltSheetTarget | null>(null);

  const views = useMemo(() => altLayerViews(layers ?? [], notes), [layers, notes]);
  const counts = useMemo(() => altCounts(views), [views]);

  const setCheck = useCallback(
    (next: CheckChoice) => {
      setCheckState(next);
      // A look at the page on request, so choosing the check is also how the list is brought up to date
      if (next !== "contrast") refresh();
    },
    [refresh]
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
    check,
    setCheck,
    groupBy,
    setGroupBy,
    sheet,
    openSheet,
    closeSheet,
    saveNote: messages.saveNote,
    annotate: messages.annotate,
    updateAnnotation: messages.updateAnnotation,
    removeAnnotation: messages.removeAnnotation,
    locate: messages.locate
  };
  return <AltChecksContext.Provider value={value}>{children}</AltChecksContext.Provider>;
}

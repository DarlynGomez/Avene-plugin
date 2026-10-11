import { useLayoutEffect } from "react";

import type { ParticipantVisibility } from "../../../shared/study/participantVisibility";
import type { SheetTarget } from "./useRootSheet";

/**
 * Closes a sheet that the participant may no longer see
 * The ignore sheet just closes, the adjust sheet is asked to cancel so its preview and log are handled
 */
export function useSheetGating(
  visibility: Pick<ParticipantVisibility, "adjustSheet" | "ignoreSheet">,
  sheet: SheetTarget | null,
  closeSheet: () => void
) {
  const ignoreHidden = sheet?.kind === "ignore" && !visibility.ignoreSheet;

  useLayoutEffect(() => {
    if (ignoreHidden) {
      closeSheet();
    }
  }, [ignoreHidden, closeSheet]);

  return { endAdjustRequested: sheet?.kind === "adjust" && !visibility.adjustSheet };
}

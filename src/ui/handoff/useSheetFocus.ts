import { useEffect, type RefObject } from "react";

const FIELD = "input:not([disabled]), textarea, select";
const ANY = "button:not([disabled])";

/** Focus goes to the first field on open, Escape closes, and focus goes back to what opened it */
export function useSheetFocus(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    // a field first, the close button in the header comes before it in the page but is not where typing starts
    (
      ref.current?.querySelector<HTMLElement>(FIELD) ?? ref.current?.querySelector<HTMLElement>(ANY)
    )?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
    // the sheet closes only by its own handlers, so this runs on open and close only
  }, []);
}

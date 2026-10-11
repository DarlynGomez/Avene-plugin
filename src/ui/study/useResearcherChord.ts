import { useCallback, useEffect, useState } from "react";

function isChord(event: KeyboardEvent): boolean {
  // The key code is used because Option changes the typed character on a Mac
  return event.ctrlKey && event.altKey && event.shiftKey && !event.metaKey && event.code === "KeyK";
}

/** Ctrl + Alt + Shift + K toggles the researcher panel and Escape closes it */
export function useResearcherChord() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isChord(event)) {
        event.preventDefault();
        setOpen((current) => !current);
        return;
      }
      if (event.key === "Escape" && open) {
        // Capture phase, so the issue panel never sees an Escape meant for this panel
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  return { open, close };
}

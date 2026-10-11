import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  "button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex='0']";

/** Moves focus into the panel on open, keeps Tab inside it, and puts focus back on close */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    const previous = document.activeElement as HTMLElement | null;
    container?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || !container) {
        return;
      }
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === container)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [containerRef]);
}

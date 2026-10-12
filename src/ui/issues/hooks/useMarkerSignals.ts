import { useEffect, useState } from "react";

import { isMarkerMessage } from "../../../shared/markers/markerMessageTypes";

/** Scrolls to the card for a root and marks it, the plugin never changes the selection itself */
export function focusRootCard(signature: string): void {
  for (const previous of document.querySelectorAll('[data-marked="true"]')) {
    previous.removeAttribute("data-marked");
  }
  const card = [...document.querySelectorAll("[data-root-signature]")].find(
    (element) => element.getAttribute("data-root-signature") === signature
  );
  if (!card) {
    return;
  }
  card.setAttribute("data-marked", "true");
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  card.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
}

/** What the sandbox says about markers: a notice to show once, and a marked layer to scroll to */
export function useMarkerSignals() {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const message = event.data?.pluginMessage;
      if (!isMarkerMessage(message)) {
        return;
      }
      if (message.type === "MARKER_NOTICE") {
        setNotice(message.message);
      } else {
        focusRootCard(message.signature);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return { notice };
}

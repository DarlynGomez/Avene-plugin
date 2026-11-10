import { createContext, useContext } from "react";

/** The ways into the Teach Me Why tab from a card, null when the tab may not be shown */
export interface ExplanationLinks {
  /** Opens the tab on the explanation for a contrast root */
  openRoot: (signature: string) => void;
  /** Opens the tab on one lesson */
  openModule: (moduleId: string) => void;
}

export const ExplanationLinkContext = createContext<ExplanationLinks | null>(null);

export function useExplanationLink(): ExplanationLinks | null {
  return useContext(ExplanationLinkContext);
}

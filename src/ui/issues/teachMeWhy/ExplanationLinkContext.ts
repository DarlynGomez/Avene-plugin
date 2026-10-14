import { createContext, useContext } from "react";

/** Opens the Teach Me Why tab on a root, null when the tab may not be shown */
export const ExplanationLinkContext = createContext<((signature: string) => void) | null>(null);

export function useExplanationLink(): ((signature: string) => void) | null {
  return useContext(ExplanationLinkContext);
}

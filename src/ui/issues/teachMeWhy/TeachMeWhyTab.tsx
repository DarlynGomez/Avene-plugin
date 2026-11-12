import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { moduleForKey } from "../../../shared/teachMeWhy/moduleForKey";
import { RoleQuestion } from "../../roles/RoleQuestion";
import { BackToIssue } from "./BackToIssue";
import { ExplanationCard } from "./ExplanationCard";
import { ModuleLibrary } from "./ModuleLibrary";
import type { TeachMeWhyState } from "./useTeachMeWhy";
import { useModulesAvailable } from "./useModulesAvailable";
import styles from "./TeachMeWhyTab.module.css";

/** Shows the selected issue explanation above the educational topic library */
export function TeachMeWhyTab({ state }: { state: TeachMeWhyState }) {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const { root, view, requestedModule } = state;
  const modulesOn = useModulesAvailable();
  const outer = useRef<HTMLDivElement>(null);
  // The control that opened a lesson, so closing it puts focus back where the reader was
  const returnTo = useRef<string | null>(null);

  // The list scrolls inside the panel and keeps its place, so a page opened from a card starts at its top
  useLayoutEffect(() => {
    for (let at = outer.current?.parentElement; at; at = at.parentElement) at.scrollTop = 0;
  }, [requestedModule, root?.signature]);
  useEffect(() => {
    if (requestedModule) setSelectedModuleId(requestedModule.id);
  }, [requestedModule]);
  useEffect(() => {
    if (selectedModuleId !== null || returnTo.current === null) return;
    const opener = outer.current?.querySelector<HTMLElement>(
      `[data-return-focus="${returnTo.current}"]`
    );
    returnTo.current = null;
    opener?.focus();
  }, [selectedModuleId]);

  function open(id: string) {
    const active = document.activeElement;
    returnTo.current = active instanceof HTMLElement ? (active.dataset.returnFocus ?? null) : null;
    setSelectedModuleId(id);
  }

  return (
    <div ref={outer} className={styles.outer}>
      {!selectedModuleId && root && view && (
        <div className={styles.highlight}>
          <BackToIssue onBack={state.backToIssue} />
          {state.role?.view?.allowed && (
            <RoleQuestion view={state.role.view} onAnswer={state.role.answer} />
          )}
          <div className={styles.body}>
            <ExplanationCard
              view={view}
              hidden={state.hidden}
              onHide={state.hide}
              onShowAgain={state.showAgain}
              onDeepDive={modulesOn ? () => open(moduleForKey(view.key)) : undefined}
            />
          </div>
        </div>
      )}
      <ModuleLibrary
        selectedModuleId={selectedModuleId}
        onSelectModule={(id) => (id === null ? setSelectedModuleId(null) : open(id))}
      />
    </div>
  );
}

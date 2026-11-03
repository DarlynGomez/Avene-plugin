import { useState } from "react";

import { rootName } from "../rootName";
import type { TeachMeWhyState } from "./useTeachMeWhy";
import { RoleQuestion } from "../../roles/RoleQuestion";
import { DepthGroup } from "./DepthGroup";
import { ExplanationCard } from "./ExplanationCard";
import { ExplanationContextLine } from "./ExplanationContextLine";
import { ModuleLibrary } from "./ModuleLibrary";
import styles from "./TeachMeWhyTab.module.css";

/** Shows the selected issue explanation above the educational topic library */
export function TeachMeWhyTab({ state }: { state: TeachMeWhyState }) {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const { root, view } = state;
  const representative = root?.instances.find((i) => i.issueId === root.representativeIssueId);
  return (
    <div className={styles.outer}>
      {!selectedModuleId && root && view && (
        <div className={styles.highlight}>
          <ExplanationContextLine
            name={rootName(root, representative?.backgroundBinding ?? null)}
            role={view.key.role}
            measured={view.measured}
            required={view.required}
            onBack={state.backToIssue}
          />
          {state.role?.view?.allowed && (
            <RoleQuestion view={state.role.view} onAnswer={state.role.answer} />
          )}
          <div className={styles.body}>
            <DepthGroup depth={state.depth} onChange={state.changeDepth} />
            <ExplanationCard
              view={view}
              hidden={state.hidden}
              onHide={state.hide}
              onShowAgain={state.showAgain}
              onDeepDive={() => setSelectedModuleId("M01")}
            />
          </div>
        </div>
      )}
      <ModuleLibrary
        selectedModuleId={selectedModuleId}
        onSelectModule={setSelectedModuleId}
      />
    </div>
  );
}

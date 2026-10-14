import { rootName } from "../rootName";
import type { TeachMeWhyState } from "./useTeachMeWhy";
import { DepthGroup } from "./DepthGroup";
import { ExplanationCard } from "./ExplanationCard";
import { ExplanationContextLine } from "./ExplanationContextLine";
import styles from "./TeachMeWhyTab.module.css";

/** Only the explanation, in one highlighted box, with nothing chosen there is one plain line */
export function TeachMeWhyTab({ state }: { state: TeachMeWhyState }) {
  const { root, view } = state;
  if (!root || !view) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>Pick an issue to see why it matters.</p>
      </div>
    );
  }
  const representative = root.instances.find((i) => i.issueId === root.representativeIssueId);
  return (
    <div className={styles.outer}>
      <div className={styles.highlight}>
        <ExplanationContextLine
          name={rootName(root, representative?.backgroundBinding ?? null)}
          role={view.key.role}
          measured={view.measured}
          required={view.required}
          onBack={state.backToIssue}
        />
        <div className={styles.body}>
          <DepthGroup depth={state.depth} onChange={state.changeDepth} />
          <ExplanationCard
            view={view}
            hidden={state.hidden}
            onHide={state.hide}
            onShowAgain={state.showAgain}
          />
        </div>
      </div>
    </div>
  );
}

import { ChevronDown, ChevronRight, EyeOff, Pin, Search, StickyNote } from "lucide-react";

import { targetLayer, type AltRoot } from "../../../shared/handoff/alt/altRoots";
import rootCard from "../../issues/components/RootCard.module.css";
import actions from "../../issues/components/RootActionsRow.module.css";
import { useAltChecks } from "./AltChecksContext";
import { AltLayerList } from "./AltLayerList";
import { AltWhyPopover } from "./AltWhyPopover";
import styles from "./Alt.module.css";

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/** One picture as a card laid out like a contrast card: name and facts, then the actions, then its layers */
export function AltCard({ root }: { root: AltRoot }) {
  const { openSheet, locate, statuses, annotationsOn, suggest, pinned, togglePin } = useAltChecks();
  const target = targetLayer(root);
  const hasNote = target.status !== "unanswered";
  const isPinned = pinned.has(root.imageHash);
  const annotated =
    annotationsOn && root.layers.some((layer) => statuses[layer.nodeId] === "in-sync");
  const suggestion = suggest.states[target.nodeId]?.status;
  const tags = [
    target.source !== "designer" && target.status === "answered"
      ? target.source === "ai"
        ? "AI-drafted"
        : "AI-drafted, edited"
      : null,
    suggestion === "ready" || suggestion === "decorative" ? "AI suggestion ready" : null,
    annotated ? "Annotated" : null
  ].filter((tag): tag is string => tag !== null);
  const locateLabel =
    root.layers.length > 1
      ? `Locate all ${root.layers.length} layers using ${root.name} on the canvas`
      : `Locate ${root.name} on the canvas`;
  return (
    <li className={rootCard.card} data-image-hash={root.imageHash}>
      <div className={styles.head}>
        <div className={styles.titleBlock}>
          <h3 className={styles.title}>{root.name}</h3>
          <p className={styles.meta}>
            {root.layers.length} {plural(root.layers.length, "layer", "layers")} {"•"}{" "}
            {root.screens.length} {plural(root.screens.length, "screen", "screens")} {"•"}{" "}
            {Math.round(target.width)} {"×"} {Math.round(target.height)}px
          </p>
        </div>
        <AltWhyPopover name={root.name} />
      </div>
      {target.status === "answered" && <p className={styles.preview}>{target.text}</p>}
      {tags.length > 0 && (
        <p className={styles.chips}>
          {tags.map((tag) => (
            <span key={tag} className={styles.chip}>
              {tag}
            </span>
          ))}
        </p>
      )}
      <div className={actions.actions}>
        <div className={actions.leftGroup}>
          <button
            type="button"
            className={actions.primaryButton}
            onClick={() => openSheet(target.nodeId)}
          >
            <StickyNote size={14} aria-hidden="true" />
            <span>{hasNote ? "Edit Note" : "Add Note"}</span>
          </button>
          {target.status !== "decorative" && (
            <button
              type="button"
              className={actions.secondaryButton}
              onClick={() => openSheet(target.nodeId, true)}
            >
              <EyeOff size={14} aria-hidden="true" />
              <span>Mark Decorative</span>
            </button>
          )}
        </div>
        <div className={actions.rightGroup}>
          <button
            type="button"
            className={actions.importantToggle}
            aria-label={locateLabel}
            title="Locate on the canvas"
            onClick={() => locate(root.layers.map((layer) => layer.nodeId))}
          >
            <Search size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${actions.importantToggle} ${isPinned ? actions.importantActive : ""}`}
            aria-pressed={isPinned}
            aria-label={isPinned ? "Remove important flag" : "Flag as important"}
            title={isPinned ? "Remove important flag" : "Flag as important"}
            onClick={() => togglePin(root.imageHash)}
          >
            <Pin size={14} aria-hidden="true" fill={isPinned ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
      {root.layers.length > 1 && (
        <details className={rootCard.instancesDisclosure}>
          <summary className={rootCard.summary}>
            <span className={rootCard.summaryLeft}>
              <ChevronRight className={rootCard.chevronClosed} size={16} aria-hidden="true" />
              <ChevronDown className={rootCard.chevronOpen} size={16} aria-hidden="true" />
              <span>Related grouped issues</span>
              <span className={rootCard.countBubble}>+{root.layers.length - 1}</span>
            </span>
          </summary>
          <AltLayerList layers={root.layers} />
        </details>
      )}
    </li>
  );
}

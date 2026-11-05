import { ChevronDown, ChevronRight, Crosshair, Image as ImageIcon } from "lucide-react";

import { targetLayer, type AltRoot } from "../../../shared/handoff/alt/altRoots";
import { useAltChecks } from "./AltChecksContext";
import { AltLayerList } from "./AltLayerList";
import { rootStatusText } from "./altStatusText";
import styles from "./Alt.module.css";

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/** One picture as a card, the thumbnail is a placeholder because the inventory carries no image */
export function AltCard({ root }: { root: AltRoot }) {
  const { openSheet, locate, statuses, annotationsOn } = useAltChecks();
  const target = targetLayer(root);
  const hasNote = target.status !== "unanswered";
  const annotated =
    annotationsOn && root.layers.some((layer) => statuses[layer.nodeId] === "in-sync");
  const needs = root.unanswered > 0;
  return (
    <li className={styles.card} data-image-hash={root.imageHash}>
      <div className={styles.head}>
        <span className={styles.thumb} aria-hidden="true">
          <ImageIcon size={20} />
        </span>
        <div className={styles.titleBlock}>
          <h3 className={styles.title}>{root.name}</h3>
          <p className={styles.meta}>
            {root.layers.length} {plural(root.layers.length, "layer", "layers")} {"•"}{" "}
            {root.screens.length} {plural(root.screens.length, "screen", "screens")} {"•"}{" "}
            {Math.round(target.width)} x {Math.round(target.height)}
          </p>
        </div>
      </div>
      <p className={styles.chips}>
        <span className={`${styles.status} ${needs ? styles.statusNeeds : ""}`}>
          {rootStatusText(root)}
        </span>
        {annotated && <span className={styles.chip}>Annotated</span>}
      </p>
      {target.status === "answered" && <p className={styles.preview}>{target.text}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => openSheet(target.nodeId)}>
          {hasNote ? "Edit note" : "Add note"}
        </button>
        {target.status !== "decorative" && (
          <button
            type="button"
            className={styles.secondary}
            onClick={() => openSheet(target.nodeId, true)}
          >
            Mark decorative
          </button>
        )}
        <button
          type="button"
          className={styles.secondary}
          aria-label={
            root.layers.length > 1
              ? `Locate all ${root.layers.length} layers using ${root.name} on the canvas`
              : `Locate ${root.name} on the canvas`
          }
          onClick={() => locate(root.layers.map((layer) => layer.nodeId))}
        >
          <Crosshair size={14} aria-hidden="true" />
          <span>Locate</span>
        </button>
      </div>
      {root.layers.length > 1 && (
        <details className={styles.disclosure}>
          <summary className={styles.summary}>
            <ChevronRight className={styles.closed} size={16} aria-hidden="true" />
            <ChevronDown className={styles.open} size={16} aria-hidden="true" />
            <span>Layers using this image</span>
            <span className={styles.count}>{root.layers.length}</span>
          </summary>
          <AltLayerList layers={root.layers} />
        </details>
      )}
    </li>
  );
}

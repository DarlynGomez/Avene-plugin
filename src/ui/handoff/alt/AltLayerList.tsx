import { Crosshair } from "lucide-react";

import type { AltLayerView } from "../../../shared/handoff/alt/altRoots";
import { useAltChecks } from "./AltChecksContext";
import { layerStatusText } from "./altStatusText";
import styles from "./Alt.module.css";

/** The layers of one picture, each with its own note and its own Locate */
export function AltLayerList({ layers }: { layers: readonly AltLayerView[] }) {
  const { openSheet, locate } = useAltChecks();
  return (
    <ul className={styles.layers}>
      {layers.map((layer) => (
        <li key={layer.nodeId} className={styles.layerRow}>
          <span className={styles.layerText}>
            <span className={styles.layerName}>{layer.name}</span>
            <span className={styles.layerMeta}>
              {layer.screenName} {"•"} {layerStatusText(layer.status)}
            </span>
          </span>
          <span className={styles.rowActions}>
            <button
              type="button"
              className={styles.small}
              aria-label={`${layer.status === "unanswered" ? "Add note" : "Edit note"} for ${layer.name}`}
              onClick={() => openSheet(layer.nodeId)}
            >
              {layer.status === "unanswered" ? "Add note" : "Edit note"}
            </button>
            <button
              type="button"
              className={styles.small}
              aria-label={`Locate ${layer.name} on the canvas`}
              onClick={() => locate([layer.nodeId])}
            >
              <Crosshair size={14} aria-hidden="true" />
              <span>Locate</span>
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

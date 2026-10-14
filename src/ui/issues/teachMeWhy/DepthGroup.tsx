import { useState } from "react";

import type { Depth } from "../../../shared/teachMeWhy/explanationTypes";
import { DEPTH_CHOICES } from "./depths";
import styles from "./DepthGroup.module.css";

interface DepthGroupProps {
  depth: Depth;
  onChange: (depth: Depth) => void;
}

/** A real radio group, the arrow keys move between the three and the labels wrap when narrow */
export function DepthGroup({ depth, onChange }: DepthGroupProps) {
  // Said once to a screen reader after a change, never on first show
  const [announcement, setAnnouncement] = useState("");

  return (
    <fieldset className={styles.group} role="radiogroup">
      <legend className={styles.legend}>How much detail</legend>
      <div className={styles.options}>
        {DEPTH_CHOICES.map((choice) => (
          <label key={choice.depth} className={styles.option}>
            <input
              type="radio"
              name="explanation-depth"
              className={styles.input}
              value={choice.depth}
              checked={depth === choice.depth}
              onChange={() => {
                onChange(choice.depth);
                setAnnouncement(`Showing ${choice.name}`);
              }}
            />
            <span className={styles.label}>{choice.name}</span>
          </label>
        ))}
      </div>
      <p className={styles.live} role="status">
        {announcement}
      </p>
    </fieldset>
  );
}

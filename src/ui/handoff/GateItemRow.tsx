import { useId, useState } from "react";

import type { HandoffItem, HandoffItemMeta } from "../../shared/handoff/types";
import styles from "./Handoff.module.css";
import sheet from "./HandoffSheet.module.css";
import { MetaForm } from "./MetaForm";

interface GateItemRowProps {
  item: HandoffItem;
  meta: HandoffItemMeta;
  onMeta: (meta: HandoffItemMeta) => void;
}

/** One item in the review step: leave it out, and for a left-as-is item add the details */
export function GateItemRow({ item, meta, onMeta }: GateItemRowProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const name = item.representative.nodeName;
  const kind = item.kind === "action" ? "needs a fix" : "left as it is";
  return (
    <li className={sheet.item}>
      <span className={sheet.itemText}>{`"${name}" on ${item.screenName}, ${kind}`}</span>
      <label className={styles.choice}>
        <input
          type="checkbox"
          checked={meta.leaveOut}
          onChange={(e) => onMeta({ ...meta, leaveOut: e.target.checked })}
        />
        {`Leave "${name}" out of this document`}
      </label>
      {item.kind === "left" && (
        <>
          <button
            type="button"
            className={styles.button}
            aria-expanded={open}
            aria-controls={`${id}-meta`}
            onClick={() => setOpen(!open)}
          >
            {`Details for "${name}"`}
          </button>
          {open && (
            <div id={`${id}-meta`}>
              <MetaForm meta={meta} onSave={onMeta} />
            </div>
          )}
        </>
      )}
    </li>
  );
}

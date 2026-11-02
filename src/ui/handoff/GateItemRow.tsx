import { useId, useState } from "react";

import { formatRatio, plural } from "../../shared/handoff/text";
import type { HandoffItem, HandoffItemMeta } from "../../shared/handoff/types";
import styles from "./Handoff.module.css";
import sheet from "./HandoffSheet.module.css";
import { MetaForm } from "./MetaForm";

interface GateItemRowProps {
  item: HandoffItem;
  meta: HandoffItemMeta;
  onMeta: (meta: HandoffItemMeta) => void;
}

/** One item in the review: its name, how far it is off, and a box to include it, with details for a kept item */
export function GateItemRow({ item, meta, onMeta }: GateItemRowProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const name = item.representative.nodeName;
  const count = item.instances.length;
  return (
    <li className={sheet.item}>
      <div className={sheet.itemRow}>
        <span className={sheet.itemName}>
          {name}
          <span className={sheet.itemSub}>
            {`${formatRatio(item.representative.measuredRatio)}:1 contrast (${count} ${plural(count, "layer", "layers")}) on ${item.screenName}`}
          </span>
        </span>
        <label className={sheet.include}>
          <input
            type="checkbox"
            aria-label={`Include "${name}"`}
            checked={!meta.leaveOut}
            onChange={(e) => onMeta({ ...meta, leaveOut: !e.target.checked })}
          />
          Include
        </label>
      </div>
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

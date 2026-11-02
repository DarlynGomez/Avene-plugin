import { DEFAULT_META } from "../../shared/handoff/buildItems";
import { plural } from "../../shared/handoff/text";
import type { HandoffInput, HandoffItem, HandoffItemMeta } from "../../shared/handoff/types";
import { GateItemRow } from "./GateItemRow";
import styles from "./Handoff.module.css";
import sheet from "./HandoffSheet.module.css";

interface ItemRowsProps {
  title: string;
  hint: string;
  items: readonly HandoffItem[];
  input: HandoffInput;
  onMeta: (signature: string, meta: HandoffItemMeta) => void;
}

/** A titled list of items with how many are included, the box on each row takes one out of the copy */
export function ItemRows({ title, hint, items, input, onMeta }: ItemRowsProps) {
  if (items.length === 0) return null;
  const included = items.filter((item) => !input.meta[item.signature]?.leaveOut).length;
  return (
    <section aria-label={title} className={sheet.group}>
      <div className={sheet.sectionRow}>
        <h3 className={sheet.sectionTitle}>{`${title} (${items.length})`}</h3>
        <span className={styles.helper} role="status">
          {`${included} included in document`}
        </span>
      </div>
      <p className={styles.helper}>{hint}</p>
      <ul className={sheet.list}>
        {items.map((item) => (
          <GateItemRow
            key={`${item.kind}-${item.screenId}-${item.signature}`}
            item={item}
            meta={input.meta[item.signature] ?? DEFAULT_META}
            onMeta={(meta) => onMeta(item.signature, meta)}
          />
        ))}
      </ul>
      <span hidden>{plural(included, "item", "items")}</span>
    </section>
  );
}

import { Search } from "lucide-react";

import { parseCardLine, splitFix, splitHead, splitMeasure } from "../../shared/handoff/cardParse";
import type { ItemGroup } from "../../shared/handoff/types";
import styles from "./Document.module.css";

interface ItemCardProps {
  /** The lines of the item as the reader sees them, already filled in and relabeled */
  lines: readonly string[];
  group: ItemGroup;
  onShow: (nodeIds: readonly string[]) => void;
}

/** One item as a card: the layer, its ratio short in code style, a suggested fix in a box, then the rest */
export function ItemCard({ lines, group, onShow }: ItemCardProps) {
  const [first, ...rest] = lines.map((line) => parseCardLine(line));
  const head = first ? splitHead(first.text) : null;
  const name = head?.name ?? (head ? `Text on ${head.screen}` : "Item");
  const measure = head ? splitMeasure(head.rest) : null;
  const colors = measure?.foreground ? ` (${measure.foreground} on ${measure.background})` : "";
  return (
    <li className={styles.item}>
      <div className={styles.itemTop}>
        <div className={styles.itemHead}>
          <strong className={styles.itemName}>{name}</strong>
          {first && (
            <span className={styles.measure}>
              {measure
                ? `${first.label}: ${measure.measured}:1 contrast${colors}`
                : `${first.label}: ${head?.rest ?? first.text}`}
            </span>
          )}
        </div>
        {group.nodeIds.length > 0 && (
          <button
            type="button"
            className={styles.find}
            aria-label={`Show ${name} in Figma`}
            title={`Show ${name} in Figma`}
            onClick={() => onShow(group.nodeIds)}
          >
            <Search size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      {measure && (
        <p className={styles.sub}>
          {`On ${head?.screen}. Needs ${measure.needs}:1 (${measure.criterion}). ${measure.extra}`.trim()}
        </p>
      )}
      {rest.map((line, i) => {
        if (!line) return null;
        const fix = splitFix(line.text);
        if (fix) {
          return (
            <div key={i} className={styles.fix}>
              <strong>Suggested fix:</strong>
              <span>
                Use <code className={styles.code}>{fix.hex}</code>
                {` on the same hue to reach ${fix.ratio}:1${measure ? ` (needs ${measure.needs}:1)` : ""}.`}
              </span>
            </div>
          );
        }
        return (
          <p key={i} className={styles.line}>
            <span
              className={styles.lineLabel}
            >{`${line.label}${line.owner ? ` (${line.owner})` : ""}:`}</span>{" "}
            {line.text}
          </p>
        );
      })}
    </li>
  );
}

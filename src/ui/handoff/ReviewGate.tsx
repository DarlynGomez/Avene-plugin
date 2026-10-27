import { useId, useMemo, useRef, useState } from "react";

import { buildAudienceDoc } from "../../shared/handoff/audiences";
import { buildItems, DEFAULT_META } from "../../shared/handoff/buildItems";
import { renderAudience } from "../../shared/handoff/render";
import type { Audience, HandoffInput, HandoffItemMeta } from "../../shared/handoff/types";
import { plural } from "../../shared/handoff/text";
import { copyText } from "../study/downloadFile";
import { GateItemRow } from "./GateItemRow";
import styles from "./Handoff.module.css";
import sheet from "./HandoffSheet.module.css";
import { useSheetFocus } from "./useSheetFocus";

interface ReviewGateProps {
  input: HandoffInput;
  audience: Audience;
  onMeta: (signature: string, meta: HandoffItemMeta) => void;
  onClose: () => void;
}

/** Every item with leave-out cleared, so an item that was left out can still be listed and brought back */
function withLeaveOutCleared(input: HandoffInput): HandoffInput {
  const meta = Object.fromEntries(
    Object.entries(input.meta).map(([signature, value]) => [
      signature,
      { ...value, leaveOut: false }
    ])
  );
  return { ...input, meta };
}

/** Name first, then what will be listed, then copy; copy waits for the name */
export function ReviewGate({ input, audience, onMeta, onClose }: ReviewGateProps) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useSheetFocus(ref, onClose);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const items = useMemo(() => buildItems(withLeaveOutCleared(input)).items, [input]);
  const doc = useMemo(() => buildAudienceDoc(input, audience), [input, audience]);
  const listed = items.filter(
    (item) => item.kind === "action" && !input.meta[item.signature]?.leaveOut
  ).length;

  async function copy() {
    const reviewer = { name: name.trim(), date: new Date().toISOString() };
    const text = renderAudience(buildAudienceDoc({ ...input, reviewer }, audience));
    setStatus(
      (await copyText(text))
        ? "Copied. Paste it where it is going."
        : "Copying did not work here. Select the preview text and copy it by hand."
    );
  }

  return (
    <div
      ref={ref}
      className={sheet.sheet}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-t`}
    >
      <h2 id={`${id}-t`} className={styles.title}>
        Before you copy
      </h2>
      <label className={styles.label} htmlFor={`${id}-name`}>
        Reviewed by
      </label>
      <p className={styles.helper} id={`${id}-help`}>
        Type your name. It prints at the top of what you copy.
      </p>
      <input
        id={`${id}-name`}
        className={styles.input}
        value={name}
        aria-describedby={`${id}-help`}
        onChange={(e) => setName(e.target.value)}
      />
      <p className={styles.helper} role="status">
        {`${listed} ${plural(listed, "item", "items")} will be listed as needing developer action`}
      </p>
      <ul className={sheet.list} aria-label="Items in this document">
        {items.map((item) => {
          const meta = input.meta[item.signature] ?? DEFAULT_META;
          return (
            <GateItemRow
              key={`${item.kind}-${item.screenId}-${item.signature}`}
              item={item}
              meta={meta}
              onMeta={(next) => onMeta(item.signature, next)}
            />
          );
        })}
      </ul>
      <p className={sheet.status}>
        This version has: {doc.sections.map((s) => s.title).join(", ")}.
      </p>
      <p className={sheet.status}>
        Text written by an AI: none. This version is template text only.
      </p>
      {doc.warnings.length > 0 && (
        <ul className={sheet.list} aria-label="Things to look at">
          {doc.warnings.map((w) => (
            <li key={`${w.item}-${w.field}-${w.match}`} className={styles.error}>
              {`Your ${w.field} text holds ${w.kind === "hex" ? "a color code" : "a number"}: ${w.match}`}
            </li>
          ))}
        </ul>
      )}
      <p className={sheet.status} role="status">
        {status}
      </p>
      <div className={sheet.actions}>
        <button type="button" className={styles.button} onClick={onClose}>
          Close
        </button>
        <button
          type="button"
          className={styles.primary}
          disabled={name.trim() === ""}
          onClick={copy}
        >
          Copy
        </button>
      </div>
    </div>
  );
}

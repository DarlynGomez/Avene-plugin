import { Copy } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";

import { buildAudienceDoc } from "../../shared/handoff/audiences";
import { buildItems } from "../../shared/handoff/buildItems";
import { composeCopy } from "../../shared/handoff/compose";
import type { Audience, HandoffInput, HandoffItemMeta } from "../../shared/handoff/types";
import { copyText } from "../study/downloadFile";
import { DraftsSection } from "./DraftsSection";
import { GateNotes } from "./GateNotes";
import styles from "./Handoff.module.css";
import sheet from "./HandoffSheet.module.css";
import { ItemRows } from "./ItemRows";
import { ReviewerBox } from "./ReviewerBox";
import { SheetHeader } from "./SheetHeader";
import type { useDrafts } from "./useDrafts";
import { useSheetFocus } from "./useSheetFocus";

interface ReviewGateProps {
  input: HandoffInput;
  audience: Audience;
  drafts: ReturnType<typeof useDrafts>;
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

/** Name first, then what goes in, then which phrasing, then copy; copy waits for the name */
export function ReviewGate({ input, audience, drafts, onMeta, onClose }: ReviewGateProps) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useSheetFocus(ref, onClose);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const items = useMemo(() => buildItems(withLeaveOutCleared(input)).items, [input]);
  const doc = useMemo(() => buildAudienceDoc(input, audience), [input, audience]);

  async function copy() {
    const reviewer = { name: name.trim(), date: new Date().toISOString() };
    const text = composeCopy(
      buildAudienceDoc({ ...input, reviewer }, audience),
      drafts.chosenText,
      reviewer.name
    );
    setStatus(
      (await copyText(text))
        ? "Copied. Paste it where it is going."
        : "Copying did not work here. Switch the document to Text, select it and copy it by hand."
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
      <SheetHeader
        id={`${id}-t`}
        title="Review and finalize handoff"
        subtitle="Checks the reviewer name, what is left out, and what you kept as it is."
        onClose={onClose}
      />
      <ReviewerBox name={name} onChange={setName} />
      <ItemRows
        title="Items needing action"
        hint="Toggle off any item to exclude it from the copied notes."
        items={items.filter((i) => i.kind === "action")}
        input={input}
        onMeta={onMeta}
      />
      <ItemRows
        title="Kept as they are"
        hint="Add who decided, what makes it easier to live with, and who signed off."
        items={items.filter((i) => i.kind === "left")}
        input={input}
        onMeta={onMeta}
      />
      <DraftsSection audience={audience} doc={doc} drafts={drafts} />
      <GateNotes doc={doc} draftWarnings={drafts.draftWarnings} />
      <p className={styles.helper} role="status">
        {status}
      </p>
      <div className={sheet.footer}>
        <button type="button" className={styles.button} onClick={onClose}>
          Back to edit
        </button>
        <button
          type="button"
          className={`${styles.primary} ${styles.withIcon}`}
          disabled={name.trim() === ""}
          onClick={() => void copy()}
        >
          <Copy size={16} aria-hidden="true" />
          Finalize and copy
        </button>
      </div>
    </div>
  );
}

import { useId, useState } from "react";

import type { HandoffItemMeta } from "../../shared/handoff/types";
import styles from "./Handoff.module.css";

interface MetaFormProps {
  meta: HandoffItemMeta;
  onSave: (meta: HandoffItemMeta) => void;
}

/** Everything here is optional, an empty field prints nothing in the document */
export function MetaForm({ meta, onSave }: MetaFormProps) {
  const id = useId();
  const [revisit, setRevisit] = useState(meta.revisitTrigger ?? "");
  const [mitigation, setMitigation] = useState(meta.mitigation ?? "");
  const [decidedBy, setDecidedBy] = useState(meta.decidedBy ?? "");
  const [signed, setSigned] = useState(meta.signOff === "signed");
  const [signedBy, setSignedBy] = useState(meta.signedBy ?? "");
  const [signedAt, setSignedAt] = useState(meta.signedAt?.slice(0, 10) ?? "");

  function save() {
    onSave({
      ...meta,
      revisitTrigger: revisit,
      mitigation,
      decidedBy,
      signOff: signed ? "signed" : "needs",
      signedBy: signed ? signedBy : "",
      signedAt: signed ? signedAt : ""
    });
  }

  const text = (key: string, label: string, value: string, set: (v: string) => void) => (
    <>
      <label className={styles.label} htmlFor={`${id}-${key}`}>
        {label}
      </label>
      <input
        id={`${id}-${key}`}
        className={styles.input}
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    </>
  );

  return (
    <div className={styles.field}>
      {text("revisit", "Look at this again when", revisit, setRevisit)}
      {text("mitigation", "What makes it easier to live with", mitigation, setMitigation)}
      {text("by", "Decided by", decidedBy, setDecidedBy)}
      <label className={styles.choice}>
        <input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} />
        Someone has signed this off
      </label>
      {signed && (
        <>
          {text("signer", "Signed off by", signedBy, setSignedBy)}
          <label className={styles.label} htmlFor={`${id}-date`}>
            Date
          </label>
          <input
            id={`${id}-date`}
            className={styles.input}
            type="date"
            value={signedAt}
            onChange={(e) => setSignedAt(e.target.value)}
          />
        </>
      )}
      <button type="button" className={styles.button} onClick={save}>
        Save details
      </button>
    </div>
  );
}

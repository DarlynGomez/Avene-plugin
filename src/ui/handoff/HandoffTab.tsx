import { useMemo, useState } from "react";

import { buildAudienceDoc } from "../../shared/handoff/audiences";
import { inputFromData, liveSignatures } from "../../shared/handoff/inputFromData";
import type { Audience } from "../../shared/handoff/types";
import { SheetOverlay } from "../issues/components/SheetOverlay";
import { AudiencePicker } from "./AudiencePicker";
import { DocumentView } from "./DocumentView";
import { FileUrlField } from "./FileUrlField";
import styles from "./Handoff.module.css";
import { NoteSheet, type NoteLayer } from "./NoteSheet";
import { ReviewGate } from "./ReviewGate";
import { useHandoff } from "./useHandoff";

/** Short documents for the people who build and decide, nothing here changes the design */
export function HandoffTab() {
  const { data, refused, writeError, setNotes, setMeta, setFileUrl } = useHandoff();
  const [audience, setAudience] = useState<Audience>("developer");
  const [sheet, setSheet] = useState<"note" | "gate" | null>(null);
  const input = useMemo(() => (data ? inputFromData(data) : null), [data]);
  const doc = useMemo(() => (input ? buildAudienceDoc(input, audience) : null), [input, audience]);

  if (refused) return <p className={styles.helper}>Handoff is not available right now.</p>;
  if (!data || !input || !doc) return <p className={styles.helper}>Loading...</p>;

  const live = [...liveSignatures(data)];
  const layers = new Map<string, NoteLayer>();
  for (const f of input.findings) layers.set(f.nodeId, { nodeId: f.nodeId, name: f.nodeName });
  for (const [nodeId, name] of Object.entries(data.noteNames)) layers.set(nodeId, { nodeId, name });

  return (
    <section className={styles.root} aria-label="Handoff">
      <h2 className={styles.title}>Handoff</h2>
      <p className={styles.helper}>
        Short notes for the people who build and decide. Nothing here changes your design.
      </p>
      {writeError && (
        <p className={styles.error} role="alert">
          {writeError}
        </p>
      )}
      <FileUrlField key={data.fileUrl ?? ""} saved={data.fileUrl} onSave={setFileUrl} />
      <AudiencePicker value={audience} onChange={setAudience} />
      <DocumentView doc={doc} audience={audience} />
      <div className={styles.row}>
        <button type="button" className={styles.button} onClick={() => setSheet("note")}>
          Add a note
        </button>
        <button type="button" className={styles.primary} onClick={() => setSheet("gate")}>
          Review and copy
        </button>
      </div>
      {sheet === "note" && (
        <SheetOverlay>
          <NoteSheet
            layers={[...layers.values()]}
            notesByNode={data.notes}
            onSave={setNotes}
            onClose={() => setSheet(null)}
          />
        </SheetOverlay>
      )}
      {sheet === "gate" && (
        <SheetOverlay>
          <ReviewGate
            input={input}
            audience={audience}
            onMeta={(sig, meta) => setMeta(sig, meta, live)}
            onClose={() => setSheet(null)}
          />
        </SheetOverlay>
      )}
    </section>
  );
}

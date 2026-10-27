import { useMemo, useState } from "react";

import { buildAudienceDoc } from "../../shared/handoff/audiences";
import { composeCopy } from "../../shared/handoff/compose";
import type { HandoffDataMessage } from "../../shared/handoff/handoffMessages";
import { inputFromData, liveSignatures } from "../../shared/handoff/inputFromData";
import type { Audience } from "../../shared/handoff/types";
import { SheetOverlay } from "../issues/components/SheetOverlay";
import { AudiencePicker } from "./AudiencePicker";
import { DocumentView } from "./DocumentView";
import { DraftPanel } from "./DraftPanel";
import { FileUrlField } from "./FileUrlField";
import styles from "./Handoff.module.css";
import { NoteSheet, type NoteLayer } from "./NoteSheet";
import { ReviewGate } from "./ReviewGate";
import { useDrafts } from "./useDrafts";
import type { useHandoff } from "./useHandoff";

interface HandoffBodyProps {
  data: HandoffDataMessage;
  actions: ReturnType<typeof useHandoff>;
}

/** The tab once the data is here: the reader, the document, the drafts and the two sheets */
export function HandoffBody({ data, actions }: HandoffBodyProps) {
  const { writeError, setNotes, setMeta, setFileUrl, setDrafts } = actions;
  const [audience, setAudience] = useState<Audience>("developer");
  const [sheet, setSheet] = useState<"note" | "gate" | null>(null);
  const input = useMemo(() => inputFromData(data), [data]);
  const docs = useMemo(
    () => ({
      developer: buildAudienceDoc(input, "developer"),
      pm: buildAudienceDoc(input, "pm"),
      higherUp: buildAudienceDoc(input, "higherUp"),
      client: buildAudienceDoc(input, "client")
    }),
    [input]
  );
  const drafts = useDrafts(docs, audience, data.drafts, setDrafts);
  const doc = docs[audience];

  const live = [...liveSignatures(data)];
  const layers = new Map<string, NoteLayer>();
  for (const f of input.findings) layers.set(f.nodeId, { nodeId: f.nodeId, name: f.nodeName });
  for (const [nodeId, name] of Object.entries(data.noteNames)) layers.set(nodeId, { nodeId, name });
  const close = () => setSheet(null);

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
      <DocumentView
        doc={doc}
        audience={audience}
        text={composeCopy(doc, drafts.chosenText, "[your name]")}
      />
      <div className={styles.row}>
        <button type="button" className={styles.button} onClick={() => setSheet("note")}>
          Add a note
        </button>
        <button type="button" className={styles.primary} onClick={() => setSheet("gate")}>
          Review and copy
        </button>
      </div>
      <DraftPanel audience={audience} doc={doc} drafts={drafts} />
      {sheet === "note" && (
        <SheetOverlay>
          <NoteSheet
            layers={[...layers.values()]}
            notesByNode={data.notes}
            onSave={setNotes}
            onClose={close}
          />
        </SheetOverlay>
      )}
      {sheet === "gate" && (
        <SheetOverlay>
          <ReviewGate
            input={input}
            audience={audience}
            onMeta={(sig, meta) => setMeta(sig, meta, live)}
            onClose={close}
            chosenText={drafts.chosenText}
            aiTitles={drafts.aiTitles}
            draftWarnings={drafts.draftWarnings}
          />
        </SheetOverlay>
      )}
    </section>
  );
}

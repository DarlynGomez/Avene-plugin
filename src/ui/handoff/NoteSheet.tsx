import { useId, useRef, useState } from "react";

import {
  NOTE_CATEGORIES,
  removeNote,
  upsertNote,
  type NodeNote,
  type NoteCategory
} from "../../shared/handoff/noteStorage";
import type { Owner } from "../../shared/handoff/types";
import styles from "./Handoff.module.css";
import sheet from "./HandoffSheet.module.css";
import { NoteKindFields } from "./NoteKindFields";
import { useSheetFocus } from "./useSheetFocus";

const CATEGORY_NAMES: Record<NoteCategory, string> = {
  alt: "Image description (alt text)",
  heading: "Heading",
  name: "Name for a control",
  state: "A state that is missing",
  question: "A question for someone"
};

export interface NoteLayer {
  nodeId: string;
  name: string;
}

interface NoteSheetProps {
  layers: readonly NoteLayer[];
  notesByNode: Readonly<Record<string, NodeNote[]>>;
  onSave: (nodeId: string, notes: NodeNote[]) => void;
  onClose: () => void;
}

/** One note per kind per layer, saving the same kind again replaces it */
export function NoteSheet({ layers, notesByNode, onSave, onClose }: NoteSheetProps) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useSheetFocus(ref, onClose);
  const [nodeId, setNodeId] = useState(layers[0]?.nodeId ?? "");
  const [category, setCategory] = useState<NoteCategory>("alt");
  const [text, setText] = useState("");
  const [decorative, setDecorative] = useState(false);
  const [level, setLevel] = useState(1);
  const [owner, setOwner] = useState<Owner>("Dev");

  const existing = notesByNode[nodeId] ?? [];
  const valid = nodeId !== "" && (text.trim() !== "" || (category === "alt" && decorative));

  function save() {
    const note: NodeNote = { category, text, updatedAt: new Date().toISOString() };
    if (category === "alt" && decorative) note.decorative = true;
    if (category === "heading") note.headingLevel = level;
    if (category === "question") note.owner = owner;
    onSave(nodeId, upsertNote(existing, note));
    onClose();
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
        Add a note for a layer
      </h2>
      <p className={styles.helper}>
        Notes are yours. CADT does not check them, and they print under your name.
      </p>
      <label className={styles.label} htmlFor={`${id}-layer`}>
        Layer
      </label>
      <select
        id={`${id}-layer`}
        className={styles.input}
        value={nodeId}
        onChange={(e) => setNodeId(e.target.value)}
      >
        {layers.map((layer) => (
          <option key={layer.nodeId} value={layer.nodeId}>
            {layer.name || layer.nodeId}
          </option>
        ))}
      </select>
      <label className={styles.label} htmlFor={`${id}-kind`}>
        What is it about?
      </label>
      <select
        id={`${id}-kind`}
        className={styles.input}
        value={category}
        onChange={(e) => setCategory(e.target.value as NoteCategory)}
      >
        {NOTE_CATEGORIES.map((name) => (
          <option key={name} value={name}>
            {CATEGORY_NAMES[name]}
          </option>
        ))}
      </select>
      <NoteKindFields
        id={id}
        category={category}
        decorative={decorative}
        level={level}
        owner={owner}
        onDecorative={setDecorative}
        onLevel={setLevel}
        onOwner={setOwner}
      />
      <label className={styles.label} htmlFor={`${id}-text`}>
        Your note
      </label>
      <textarea
        id={`${id}-text`}
        className={styles.input}
        rows={3}
        value={text}
        disabled={category === "alt" && decorative}
        onChange={(e) => setText(e.target.value)}
      />
      <div className={sheet.actions}>
        {existing.some((n) => n.category === category) && (
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              onSave(nodeId, removeNote(existing, category));
              onClose();
            }}
          >
            Remove this note
          </button>
        )}
        <button type="button" className={styles.button} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={styles.primary} disabled={!valid} onClick={save}>
          Save note
        </button>
      </div>
    </div>
  );
}

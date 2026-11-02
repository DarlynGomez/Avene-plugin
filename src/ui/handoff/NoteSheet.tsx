import { useId, useRef, useState } from "react";

import { displayLabel } from "../../shared/handoff/labels";
import {
  NOTE_CATEGORIES,
  removeNote,
  upsertNote,
  type NodeNote,
  type NoteCategory
} from "../../shared/handoff/noteStorage";
import type { Audience, Owner } from "../../shared/handoff/types";
import styles from "./Handoff.module.css";
import sheet from "./HandoffSheet.module.css";
import { CATEGORY_NAMES } from "./noteCategoryNames";
import { NoteFooter } from "./NoteFooter";
import { NoteKindFields } from "./NoteKindFields";
import { NoteTextFields } from "./NoteTextFields";
import { SheetHeader } from "./SheetHeader";
import { useSheetFocus } from "./useSheetFocus";

export interface NoteLayer {
  nodeId: string;
  name: string;
}

interface NoteSheetProps {
  /** The kind of note to start on, a question when it was opened from the document */
  initialCategory?: NoteCategory;
  audience?: Audience;
  layers: readonly NoteLayer[];
  notesByNode: Readonly<Record<string, NodeNote[]>>;
  onSave: (nodeId: string, notes: NodeNote[]) => void;
  onClose: () => void;
}

/** One note per kind per layer, saving the same kind again replaces it */
export function NoteSheet({
  initialCategory = "alt",
  audience = "developer",
  layers,
  notesByNode,
  onSave,
  onClose
}: NoteSheetProps) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  useSheetFocus(ref, onClose);
  const [nodeId, setNodeId] = useState(layers[0]?.nodeId ?? "");
  const [category, setCategory] = useState<NoteCategory>(initialCategory);
  const [text, setText] = useState("");
  const [contact, setContact] = useState("");
  const [decorative, setDecorative] = useState(false);
  const [level, setLevel] = useState(1);
  const [owner, setOwner] = useState<Owner>("Dev");

  const existing = notesByNode[nodeId] ?? [];
  const valid = nodeId !== "" && (text.trim() !== "" || (category === "alt" && decorative));

  function save() {
    const note: NodeNote = { category, text, updatedAt: new Date().toISOString() };
    if (contact.trim() !== "") note.contact = contact;
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
      <SheetHeader
        id={`${id}-t`}
        title="Add designer note to layer"
        subtitle={`Prints as a formal statement under the ${displayLabel("Decision", audience)} label.`}
        onClose={onClose}
      />
      <label className={styles.label} htmlFor={`${id}-layer`}>
        Layer target name
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
        Note category
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
      <NoteTextFields
        id={id}
        text={text}
        contact={contact}
        locked={category === "alt" && decorative}
        onText={setText}
        onContact={setContact}
      />
      <NoteFooter
        canRemove={existing.some((x) => x.category === category)}
        valid={valid}
        onRemove={() => {
          onSave(nodeId, removeNote(existing, category));
          onClose();
        }}
        onCancel={onClose}
        onSave={save}
      />
    </div>
  );
}

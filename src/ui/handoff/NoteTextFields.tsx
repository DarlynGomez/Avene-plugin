import styles from "./Handoff.module.css";

interface NoteTextFieldsProps {
  id: string;
  text: string;
  contact: string;
  /** A decoration image has nothing to say, so the statement is switched off */
  locked: boolean;
  onText: (value: string) => void;
  onContact: (value: string) => void;
}

/** What the designer wants said, and who to ask about it */
export function NoteTextFields({
  id,
  text,
  contact,
  locked,
  onText,
  onContact
}: NoteTextFieldsProps) {
  return (
    <>
      <label className={styles.label} htmlFor={`${id}-text`}>
        Statement / instructions
      </label>
      <textarea
        id={`${id}-text`}
        className={styles.input}
        rows={3}
        value={text}
        placeholder="Write clear instructions for developers or product team..."
        disabled={locked}
        onChange={(e) => onText(e.target.value)}
      />
      <label className={styles.label} htmlFor={`${id}-contact`}>
        Owner / contact
      </label>
      <input
        id={`${id}-contact`}
        className={styles.input}
        value={contact}
        placeholder="e.g. Elena (Design) or Jordan (Front-end)"
        onChange={(e) => onContact(e.target.value)}
      />
    </>
  );
}

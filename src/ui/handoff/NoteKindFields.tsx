import type { NoteCategory } from "../../shared/handoff/noteStorage";
import type { Owner } from "../../shared/handoff/types";
import styles from "./Handoff.module.css";

const OWNERS: Owner[] = ["Dev", "PM", "Design"];

interface NoteKindFieldsProps {
  id: string;
  category: NoteCategory;
  decorative: boolean;
  level: number;
  owner: Owner;
  onDecorative: (value: boolean) => void;
  onLevel: (value: number) => void;
  onOwner: (value: Owner) => void;
}

/** The one extra field a kind of note needs */
export function NoteKindFields({
  id,
  category,
  decorative,
  level,
  owner,
  onDecorative,
  onLevel,
  onOwner
}: NoteKindFieldsProps) {
  return (
    <>
      {category === "alt" && (
        <label className={styles.choice}>
          <input
            type="checkbox"
            checked={decorative}
            onChange={(e) => onDecorative(e.target.checked)}
          />
          This image is decoration, so its description stays empty
        </label>
      )}
      {category === "heading" && (
        <>
          <label className={styles.label} htmlFor={`${id}-level`}>
            Heading level
          </label>
          <select
            id={`${id}-level`}
            className={styles.input}
            value={level}
            onChange={(e) => onLevel(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </>
      )}
      {category === "question" && (
        <>
          <label className={styles.label} htmlFor={`${id}-owner`}>
            Who should answer?
          </label>
          <select
            id={`${id}-owner`}
            className={styles.input}
            value={owner}
            onChange={(e) => onOwner(e.target.value as Owner)}
          >
            {OWNERS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </>
      )}
    </>
  );
}

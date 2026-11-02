import { Check, Link2 } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import styles from "./Handoff.module.css";
import { StepCard } from "./StepCard";

interface FileUrlFieldProps {
  saved: string | null;
  onSave: (url: string) => void;
}

/** The file address is pasted once so each item can link to its layer */
export function FileUrlField({ saved, onSave }: FileUrlFieldProps) {
  const id = useId();
  const [url, setUrl] = useState(saved ?? "");
  const dirty = url.trim() !== (saved ?? "");

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave(url);
  }

  const linked = saved !== null && !dirty;
  return (
    <StepCard
      step={1}
      title="Figma file link"
      aside={
        linked && (
          <span className={styles.linked}>
            <Check size={14} aria-hidden="true" />
            Linked
          </span>
        )
      }
    >
      <p className={styles.helper} id={`${id}-help`}>
        Paste it once. Every item in the document carries a link that opens the exact layer in
        Figma.
      </p>
      <form className={styles.row} onSubmit={submit}>
        <span className={styles.urlBox}>
          <Link2 size={16} aria-hidden="true" />
          <input
            id={id}
            className={styles.urlInput}
            type="url"
            aria-label="Link to this Figma file"
            aria-describedby={`${id}-help`}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </span>
        {dirty && (
          <button type="submit" className={styles.button}>
            Save link
          </button>
        )}
      </form>
    </StepCard>
  );
}

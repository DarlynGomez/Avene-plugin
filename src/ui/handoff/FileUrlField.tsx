import { useId, useState } from "react";

import styles from "./Handoff.module.css";

interface FileUrlFieldProps {
  saved: string | null;
  onSave: (url: string) => void;
}

/** The file address is pasted once so each item can link to its layer */
export function FileUrlField({ saved, onSave }: FileUrlFieldProps) {
  const id = useId();
  const [url, setUrl] = useState(saved ?? "");
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        Link to this Figma file
      </label>
      <p className={styles.helper} id={`${id}-help`}>
        Paste it once so each item can link to its layer. Leave it empty to skip links.
      </p>
      <div className={styles.row}>
        <input
          id={id}
          className={styles.input}
          type="url"
          value={url}
          aria-describedby={`${id}-help`}
          onChange={(event) => setUrl(event.target.value)}
        />
        <button type="button" className={styles.button} onClick={() => onSave(url)}>
          Save link
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";

import type { StudyExportReadyMessage } from "../../shared/study/studyMessageTypes";
import styles from "./ExportResult.module.css";
import { copyText, saveTextFile } from "./downloadFile";

interface ExportResultProps {
  file: StudyExportReadyMessage;
}

/** What was exported, with save and copy kept to hand because the plugin cannot see the disk */
export function ExportResult({ file }: ExportResultProps) {
  const [copied, setCopied] = useState<boolean | null>(null);

  async function copy() {
    setCopied(await copyText(file.text));
  }

  return (
    <section className={styles.result} aria-label="Export">
      <p className={styles.title}>Export ready: {file.fileName}</p>
      <p className={styles.note}>
        {file.eventCount} study events. The plugin cannot tell whether the file reached your disk.
        If no file appeared, use Copy contents and paste it into a new file.
      </p>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.button}
          onClick={() => saveTextFile(file.fileName, file.text)}
        >
          Save file again
        </button>
        <button type="button" className={styles.button} onClick={copy}>
          Copy contents
        </button>
      </div>
      {copied !== null && (
        <p role="status" className={styles.note}>
          {copied ? "Copied." : "Could not copy. Select the text below and copy it by hand."}
        </p>
      )}
      <label className={styles.label} htmlFor="study-export-text">
        Export contents
      </label>
      <textarea
        id="study-export-text"
        className={styles.text}
        readOnly
        value={file.text}
        rows={6}
      />
    </section>
  );
}

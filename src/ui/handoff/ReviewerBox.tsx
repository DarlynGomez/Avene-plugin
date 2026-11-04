import { Check, User } from "lucide-react";
import { useId } from "react";

import sheet from "./HandoffSheet.module.css";

interface ReviewerBoxProps {
  name: string;
  onChange: (name: string) => void;
}

/** The reviewer is typed, never filled in for the designer, and nothing is copied until there is a name */
export function ReviewerBox({ name, onChange }: ReviewerBoxProps) {
  const id = useId();
  return (
    <div className={sheet.reviewer}>
      <label className={sheet.reviewerLabel} htmlFor={id}>
        <User size={16} aria-hidden="true" />
        Reviewer full name
        <span className={sheet.required}>REQUIRED TO COPY</span>
      </label>
      <input
        id={id}
        className={sheet.reviewerInput}
        value={name}
        onChange={(e) => onChange(e.target.value)}
      />
      {name.trim() !== "" && (
        <p className={sheet.confirm} role="status">
          <Check size={16} aria-hidden="true" />
          Reviewer named. You can now finalize and copy the notes.
        </p>
      )}
    </div>
  );
}

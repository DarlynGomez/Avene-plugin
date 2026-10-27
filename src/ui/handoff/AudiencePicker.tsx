import type { Audience } from "../../shared/handoff/types";
import styles from "./Handoff.module.css";

export const AUDIENCE_NAMES: Record<Audience, string> = {
  developer: "Developers",
  pm: "Product managers",
  higherUp: "Leadership",
  client: "A client"
};

interface AudiencePickerProps {
  value: Audience;
  onChange: (audience: Audience) => void;
}

export function AudiencePicker({ value, onChange }: AudiencePickerProps) {
  return (
    <fieldset className={styles.field}>
      <legend className={styles.label}>Who is it for?</legend>
      <div className={styles.row}>
        {(Object.keys(AUDIENCE_NAMES) as Audience[]).map((audience) => (
          <label key={audience} className={styles.choice}>
            <input
              type="radio"
              name="handoff-audience"
              checked={value === audience}
              onChange={() => onChange(audience)}
            />
            {AUDIENCE_NAMES[audience]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

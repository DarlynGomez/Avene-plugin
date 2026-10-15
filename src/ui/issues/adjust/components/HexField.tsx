import { useId, useState } from "react";

import { rgbToHex } from "../../../../shared/colour/colorHex";
import { validateHexInput, type HexInputResult } from "../../../../shared/colour/hexInput";
import type { RGBColor } from "../../../../shared/issues/issueTypes";
import styles from "./HexField.module.css";

interface HexFieldProps {
  background: RGBColor;
  requiredRatio: number;
  /** Null whenever there is no currently valid typed colour to apply */
  onColorChange: (color: RGBColor | null) => void;
  /** Fires once per rejection, malformed or failing contrast, for the log entry */
  onRejected?: () => void;
}

/**
 * Typed path to the same result as the wheel
 * A failing hex is refused with its ratio and the nearest passing colour is offered
 */
export function HexField({ background, requiredRatio, onColorChange, onRejected }: HexFieldProps) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<HexInputResult | null>(null);
  const fieldId = useId();
  const errorId = useId();

  function handleChange(value: string) {
    setInput(value);
    if (value.trim() === "") {
      setResult(null);
      onColorChange(null);
      return;
    }
    const validated = validateHexInput(value, background, requiredRatio);
    setResult(validated);
    onColorChange(validated.kind === "valid" ? validated.color : null);
    if (validated.kind !== "valid") {
      onRejected?.();
    }
  }

  function useAlternative(color: RGBColor) {
    setInput(rgbToHex(color));
    setResult({ kind: "valid", color });
    onColorChange(color);
  }

  const invalid = result !== null && result.kind !== "valid";

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={fieldId}>
        Type a hex color
      </label>
      <input
        id={fieldId}
        className={styles.input}
        type="text"
        placeholder="#RRGGBB"
        value={input}
        onChange={(event) => handleChange(event.target.value)}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
      />
      {result?.kind === "malformed" && (
        <p id={errorId} className={styles.error} role="alert">
          That is not a valid hex color.
        </p>
      )}
      {result?.kind === "fails-contrast" && (
        <p id={errorId} className={styles.error} role="alert">
          {result.achievedRatio.toFixed(2)}:1 achieved, {result.requiredRatio.toFixed(1)}:1 required.{" "}
          {result.nearestOnHue ? (
            <button
              type="button"
              className={styles.alternative}
              onClick={() => result.nearestOnHue && useAlternative(result.nearestOnHue)}
            >
              Use the nearest passing color on this hue
            </button>
          ) : (
            "This hue cannot pass at any lightness."
          )}
        </p>
      )}
    </div>
  );
}

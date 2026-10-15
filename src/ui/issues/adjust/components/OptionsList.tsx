import { rgbToHex } from "../../../../shared/colour/colorHex";
import { contrastRatio } from "../../../../shared/colour/contrastRatio";
import type { NamedColor } from "../../../../shared/colour/paletteMatch";
import type { RGBColor } from "../../../../shared/issues/issueTypes";
import { OptionTile } from "./OptionTile";
import { WheelView } from "./WheelView";
import styles from "./OptionsList.module.css";

export type FocusedOption = "a" | "b" | "c" | null;

interface OptionsListProps {
  sampleText: string;
  background: RGBColor;
  backgroundAncestorName: string;
  requiredRatio: number;
  optionA: RGBColor;
  optionB: NamedColor | null;
  wheelColor: RGBColor | null;
  focused: FocusedOption;
  onFocusOption: (option: FocusedOption, color: RGBColor) => void;
  onOpenWheel: () => void;
  onColorChange: (color: RGBColor | null) => void;
  onHexRejected: () => void;
}

/** The option cards, the third expands the wheel in place when chosen */
export function OptionsList({
  sampleText,
  background,
  backgroundAncestorName,
  requiredRatio,
  optionA,
  optionB,
  wheelColor,
  focused,
  onFocusOption,
  onOpenWheel,
  onColorChange,
  onHexRejected
}: OptionsListProps) {
  return (
    <div className={styles.list}>
      <OptionTile
        label="Keep your color"
        reason="Same hue and saturation, the least change that passes"
        sampleText={sampleText}
        color={optionA}
        hex={rgbToHex(optionA)}
        achievedRatio={contrastRatio(optionA, background)}
        requiredRatio={requiredRatio}
        focused={focused === "a"}
        onFocus={() => onFocusOption("a", optionA)}
        onActivate={() => onFocusOption("a", optionA)}
      />
      {optionB && (
        <OptionTile
          label="From your file"
          reason={`Already in use as ${optionB.name ?? "an unnamed color"}`}
          sampleText={sampleText}
          color={optionB.color}
          hex={rgbToHex(optionB.color)}
          achievedRatio={contrastRatio(optionB.color, background)}
          requiredRatio={requiredRatio}
          focused={focused === "b"}
          onFocus={() => onFocusOption("b", optionB.color)}
          onActivate={() => onFocusOption("b", optionB.color)}
        />
      )}
      <div className={styles.wheelCard}>
        <OptionTile
          label="Choose your own"
          reason={`Colors too faint to read against "${backgroundAncestorName}" (${rgbToHex(background)}) are faded.`}
          sampleText={sampleText}
          color={wheelColor ?? optionA}
          hex={rgbToHex(wheelColor ?? optionA)}
          achievedRatio={wheelColor ? contrastRatio(wheelColor, background) : null}
          requiredRatio={requiredRatio}
          focused={focused === "c"}
          onFocus={onOpenWheel}
          onActivate={onOpenWheel}
        />
        {focused === "c" && (
          <div className={styles.wheelExpanded}>
            <WheelView
              background={background}
              backgroundAncestorName={backgroundAncestorName}
              requiredRatio={requiredRatio}
              initialColor={wheelColor ?? optionA}
              onColorChange={onColorChange}
              onHexRejected={onHexRejected}
            />
          </div>
        )}
      </div>
    </div>
  );
}

import { useId } from "react";

import type { AltStyle } from "../../../shared/handoff/alt/altStyles";
import { AltDecorativeToggle } from "./AltDecorativeToggle";
import { AltDescription } from "./AltDescription";
import { AltGenerateRow } from "./AltGenerateRow";

interface AltNoteFieldsProps {
  text: string;
  decorative: boolean;
  style: AltStyle;
  working: boolean;
  live: boolean;
  onText: (value: string) => void;
  onDecorative: (value: boolean) => void;
  onStyle: (style: AltStyle) => void;
  onGenerate: () => void;
  onRegenerate: () => void;
}

/** The switch, the setting and Generate with AI, then the description, in the order a designer works down them */
export function AltNoteFields(props: AltNoteFieldsProps) {
  const id = useId();
  return (
    <>
      <AltDecorativeToggle decorative={props.decorative} onChange={props.onDecorative} />
      <AltGenerateRow
        style={props.style}
        onStyle={props.onStyle}
        working={props.working}
        disabled={props.decorative}
        onGenerate={props.onGenerate}
      />
      <AltDescription
        id={id}
        text={props.text}
        decorative={props.decorative}
        onText={props.onText}
        canRegenerate={props.live && !props.decorative}
        onRegenerate={props.onRegenerate}
      />
    </>
  );
}

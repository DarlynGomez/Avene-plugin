import { SheetOverlay } from "../../issues/components/SheetOverlay";
import { useAltChecks } from "./AltChecksContext";
import { AltNoteSheet } from "./AltNoteSheet";

/** The note sheet as one overlay over the whole panel, found by layer; nothing when the checks are off */
export function AltSheetHost() {
  const { available, sheet, views } = useAltChecks();
  if (!available || sheet === null) return null;
  const layer = views.find((view) => view.nodeId === sheet.nodeId);
  if (!layer) return null;
  const group = views.filter((view) => view.imageHash === layer.imageHash);
  return (
    <SheetOverlay>
      <AltNoteSheet
        key={layer.nodeId}
        layer={layer}
        group={group}
        startDecorative={sheet.decorative}
      />
    </SheetOverlay>
  );
}

import type { Root } from "../../../shared/grouping/groupingTypes";
import type { ContrastEvidenceView } from "../../../shared/issues/contrastEvidenceView";
import { rootName } from "../rootName";
import { RootMetadataGrid } from "./RootMetadataGrid";
import styles from "./RootCardSummary.module.css";
import { RootStatusDot } from "./RootStatusDot";
import { SeverityTag } from "./SeverityTag";
import { WhySurfacedPopover } from "./WhySurfacedPopover";

function typographyLine(evidence: ContrastEvidenceView | null): string | null {
  if (evidence?.fontSizePx === undefined || evidence.isBold === undefined) {
    return null;
  }
  return `${evidence.fontSizePx}px • ${evidence.isBold ? 700 : 400}`;
}

interface RootCardSummaryProps {
  root: Root;
  representativeEvidence: ContrastEvidenceView | null;
  recordedReason: string | null;
}

/** Card header, name, typography line, status row and the metadata grid, split out of RootCard */
export function RootCardSummary({
  root,
  representativeEvidence,
  recordedReason
}: RootCardSummaryProps) {
  const representative = root.instances.find((i) => i.issueId === root.representativeIssueId);
  const typography = typographyLine(representativeEvidence);

  return (
    <>
      <div className={styles.headerRow}>
        <div className={styles.nameGroup}>
          <h3 className={styles.name}>
            {rootName(root, representative?.backgroundBinding ?? null)}
          </h3>
          {typography && <p className={styles.typography}>{typography}</p>}
        </div>
        <div className={styles.headerRight}>
          <RootStatusDot displayState={root.displayState} />
          <SeverityTag severity={representative?.severity ?? "low"} />
          <WhySurfacedPopover
            signature={root.signature}
            measuredRatio={representative?.measuredRatio ?? 0}
            requiredRatio={root.requiredRatio}
            severity={representative?.severity ?? "low"}
          />
        </div>
      </div>

      <RootMetadataGrid
        root={root}
        measuredRatio={representative?.measuredRatio ?? 0}
        representativeEvidence={representativeEvidence}
      />

      {recordedReason && (
        <p className={styles.reasonNote}>
          <strong>Reason recorded:</strong> &ldquo;{recordedReason}&rdquo;
        </p>
      )}
    </>
  );
}

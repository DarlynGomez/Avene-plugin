import { X } from "lucide-react";

import sheet from "./HandoffSheet.module.css";

interface SheetHeaderProps {
  id: string;
  title: string;
  subtitle: string;
  onClose: () => void;
}

/** A serif title, one plain line under it, and a close button, the same on every sheet */
export function SheetHeader({ id, title, subtitle, onClose }: SheetHeaderProps) {
  return (
    <header className={sheet.header}>
      <div>
        <h2 id={id} className={sheet.sheetTitle}>
          {title}
        </h2>
        <p className={sheet.sheetSub}>{subtitle}</p>
      </div>
      <button type="button" className={sheet.close} aria-label="Close" onClick={onClose}>
        <X size={20} aria-hidden="true" />
      </button>
    </header>
  );
}

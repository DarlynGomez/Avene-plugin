import { ChevronDown, Download } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import styles from "./DownloadMenu.module.css";

export type DownloadKind = "pdf" | "html";

interface DownloadMenuProps {
  onPick: (kind: DownloadKind) => void;
}

const OPTIONS: readonly { kind: DownloadKind; label: string }[] = [
  { kind: "pdf", label: "PDF" },
  { kind: "html", label: "HTML" }
];

/** One dark Download button that opens a short list of file kinds above it, and closes on a pick, Escape or a click elsewhere */
export function DownloadMenu({ onPick }: DownloadMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    items.current[0]?.focus();
    const away = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }

  function onMenuKey(event: KeyboardEvent<HTMLDivElement>) {
    const at = items.current.findIndex((item) => item === document.activeElement);
    const last = OPTIONS.length - 1;
    const go = (index: number) => {
      event.preventDefault();
      items.current[index]?.focus();
    };
    if (event.key === "Escape") {
      // Only the menu closes, so a sheet behind it stays open
      event.stopPropagation();
      close(true);
    } else if (event.key === "ArrowDown") go(at >= last ? 0 : at + 1);
    else if (event.key === "ArrowUp") go(at <= 0 ? last : at - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(last);
    else if (event.key === "Tab") close(false);
  }

  return (
    <div className={styles.root} ref={root}>
      <button
        ref={button}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((was) => !was)}
      >
        <Download size={16} aria-hidden="true" />
        Download
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Download as"
          className={styles.menu}
          onKeyDown={onMenuKey}
        >
          {OPTIONS.map((option, i) => (
            <button
              key={option.kind}
              ref={(el) => {
                items.current[i] = el;
              }}
              type="button"
              role="menuitem"
              className={styles.item}
              onClick={() => {
                close(true);
                onPick(option.kind);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

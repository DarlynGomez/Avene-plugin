import { ArrowRight, HelpCircle, X } from "lucide-react";
import { useState } from "react";

import { ALT_WHY_REQUIREMENT, altWhyText } from "../../../shared/handoff/alt/altCopy";
import why from "../../issues/components/WhySurfacedPopover.module.css";
import { useExplanationLink } from "../../issues/teachMeWhy/ExplanationLinkContext";

/** The lesson on alt text in the Teach Me Why tab */
const ALT_MODULE_ID = "M11";

/** The same small help button as the contrast cards, with what an image needs and a way into its lesson */
export function AltWhyPopover({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const links = useExplanationLink();
  return (
    <div className={why.wrapper}>
      <button
        type="button"
        className={why.trigger}
        aria-expanded={open}
        aria-label="Why this surfaced"
        onClick={() => setOpen((value) => !value)}
      >
        <HelpCircle size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className={why.popover} role="status">
          <div className={why.header}>
            <span className={why.title}>Why this surfaced</span>
            <button
              type="button"
              className={why.close}
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          <p className={why.ratioLine}>
            <span className={why.ratioLabel}>WCAG Requirement</span>
            <strong>{ALT_WHY_REQUIREMENT}</strong>
          </p>
          <p className={why.context}>{altWhyText(name)}</p>
          {links && (
            <button
              type="button"
              className={why.why}
              onClick={() => {
                setOpen(false);
                links.openModule(ALT_MODULE_ID);
              }}
            >
              <span>Learn more in Teach Me Why</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

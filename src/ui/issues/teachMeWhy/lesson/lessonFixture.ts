import { LEARNING_MODULES } from "../../../../shared/teachMeWhy/modules/modules";
import type { LearningModule } from "../../../../shared/teachMeWhy/modules/moduleTypes";

const lesson = (id: string): LearningModule => {
  const found = LEARNING_MODULES.find((module) => module.id === id);
  if (!found) throw new Error(`${id} is not a lesson`);
  return found;
};

/** M04 as the artboard shows it, with M01's clip added so every block is there */
export const FULL_LESSON: LearningModule = { ...lesson("M04"), video: lesson("M01").video };

/** A lesson with no clip and no article */
export const PLAIN_LESSON: LearningModule = lesson("M05");

/** What each child of the page is, in order, read from its heading or label */
export function blockNames(container: HTMLElement): string[] {
  const article = container.querySelector("article");
  if (!article) return [];
  return [...article.children].map((child) => {
    const labelledBy = child.getAttribute("aria-labelledby");
    const heading = labelledBy ? container.ownerDocument.getElementById(labelledBy) : null;
    return (
      heading?.textContent ??
      child.getAttribute("aria-label") ??
      (child.tagName === "HEADER" ? "header" : (child.textContent ?? "").slice(0, 7))
    );
  });
}

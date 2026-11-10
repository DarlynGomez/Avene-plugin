import type { LearningModule } from "./moduleTypes";

/** The lesson behind the alt text check, text only because no video has been chosen for it */
export const module11: LearningModule = {
  id: "M11",
  title: "Alt Text for Images",
  category: "visual",
  context: "Image descriptions and decorative images",
  estimatedMinutes: 3,
  timeBudgetMinutes: { reading: 3, video: 0, quiz: 0 },
  whyItMatters:
    "Someone who uses a screen reader hears a description of an image instead of seeing it. Without one, the image is skipped or read out as a file name.",
  learningObjectives: [
    "Say what an image is for before how it looks.",
    "Keep a description short and plain.",
    "Mark an image decorative when it adds nothing."
  ],
  lessonParagraphs: [
    "An image can carry something the text around it does not. A screen reader reads the alt text aloud in the image's place, so the alt text is how someone who cannot see the image gets what it was there to say.",
    "Good alt text says what the image is for before it says how it looks. A cart icon that opens the checkout is better described as Review your cart than as a shopping cart. Start with the subject and leave out image of or picture of, because the screen reader already says it is an image.",
    "Keep it to a sentence. Many teams aim for about 125 characters or fewer. That is a common habit and not a rule, so a chart or a diagram may need a longer description nearby.",
    "If an image is only there for looks, like a background pattern, mark it decorative. A screen reader then skips it, which is kinder than reading out a file name.",
    "If the image is mostly text, write that text exactly. If it shows a person, say what they are doing and do not guess who they are."
  ],
  video: null,
  optionalArticle: null,
  keyTakeaways: [
    "Say what the image is for, then how it looks.",
    "Aim for one short sentence, and longer only when the image needs it.",
    "Mark images that are only for looks as decorative."
  ],
  reviewFlags: ["Written for the alt text check and not yet reviewed by a person"]
};

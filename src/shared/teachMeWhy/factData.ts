import type { Fact } from "./explanationTypes";

/** The first nine facts, excerpts stay unverified until the whole source is read */
export const FACTS_ONE: readonly Fact[] = [
  {
    id: "F01",
    plain:
      "Contrast compares how light your text is with how light its background is. The scale runs from 1:1, where they look the same, to 21:1, black on white.",
    reviewerNote: "The ratio is the relative luminance ratio",
    source: "WebAIM Contrast and Color Accessibility; W3C",
    dateRead: "2026-10-07",
    readStatus: "full",
    excerptVerified: false
  },
  {
    id: "F02",
    plain:
      "The minimum for small text was chosen to make up for the contrast sensitivity people typically lose with age, roughly what is commonly reported as typical at about age 80.",
    reviewerNote:
      "W3C says 20/40 vision is commonly reported as typical at about age 80 and corresponds to about 4.5:1. The 3:1 minimum comes from ISO 9241-3 and ANSI-HFES-100-1988 for typical vision",
    source: "W3C, Understanding Success Criterion 1.4.3",
    dateRead: "2026-10-07",
    readStatus: "excerpt",
    excerptVerified: false
  },
  {
    id: "F03",
    plain:
      "Larger, bolder text has thicker strokes, so it is easier to read and the minimum is lower. Text counts as large at 24 pixels, or about 18.7 pixels if it is bold.",
    reviewerNote:
      "18 point is 24 pixels and 14 point about 18.67 pixels. Bold is weight 700 or more",
    source: "WebAIM Contrast and Color Accessibility; W3C",
    dateRead: "2026-10-07",
    readStatus: "full",
    excerptVerified: false
  },
  {
    id: "F04",
    plain:
      "Text that is purely decoration, part of a logo, or on a disabled control has no contrast minimum. Text that carries information does.",
    reviewerNote: "The exceptions are decorative, logotype and inactive component text",
    source: "WebAIM Contrast and Color Accessibility; W3C",
    dateRead: "2026-10-07",
    readStatus: "full",
    excerptVerified: false
  },
  {
    id: "F05",
    plain:
      "Text on a photo, a gradient, or a semi-transparent layer still needs enough contrast. Check the place where it is weakest.",
    reviewerNote: "",
    source: "WebAIM Contrast and Color Accessibility",
    dateRead: "2026-10-07",
    readStatus: "full",
    excerptVerified: false
  },
  {
    id: "F06",
    plain: "Lowering opacity makes text fainter, because the colour behind it shows through.",
    reviewerNote: "Avene's own deferred card lost contrast to this when dimmed with half opacity",
    source: "WebAIM Contrast and Color Accessibility",
    dateRead: "2026-10-07",
    readStatus: "full",
    excerptVerified: false
  },
  {
    id: "F07",
    plain:
      "Small, faint, or hard-to-enlarge text is hard to read for many people with low vision. For people with cataracts, which can make everything look hazy, contrast matters most in bright light.",
    reviewerNote: "",
    source: "WebAIM, Visual Disabilities: Low Vision",
    dateRead: "2026-10-07",
    readStatus: "full",
    excerptVerified: false
  },
  {
    id: "F08",
    plain:
      "Pure black on white can feel harsh to some readers. The aim is text that is comfortable and still clears the minimum.",
    reviewerNote: "",
    source: "WebAIM, Visual Disabilities: Low Vision",
    dateRead: "2026-10-07",
    readStatus: "full",
    excerptVerified: false
  },
  {
    id: "F09",
    plain: "Hard-to-read text causes eye strain, and research has shown people trust it less.",
    reviewerNote: "Check the trust claim against the article",
    source: "NN/g, Low-Contrast Text Is Not the Answer (2015)",
    dateRead: "2026-10-07",
    readStatus: "excerpt",
    excerptVerified: false
  }
];

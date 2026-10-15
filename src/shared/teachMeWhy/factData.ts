import type { Fact } from "./explanationTypes";

export const FACTS_ONE: readonly Fact[] = [
  {
    id: "F01",
    plain:
      "Contrast compares how light your text is with how light its background is. The scale runs from 1:1, where they look the same, to 21:1, black on white.",
    reviewerNote:
      "The ratio is the relative luminance ratio. Full page title: Understanding Success Criterion 1.4.3: Contrast (Minimum)",
    source: "World Wide Web Consortium (W3C), Contrast (Minimum)",
    dateRead: "2026-10-07",
    readStatus: "full",
    excerptVerified: true
  },
  {
    id: "F02",
    plain:
      "The minimum for small text was set to make up for the contrast sensitivity that typically declines with age, using the vision commonly reported as typical at about age 80 as its reference point.",
    reviewerNote:
      "W3C: 4.5:1 is 3 x 1.5, where 20/40 acuity is linked to a 1.5 loss of contrast sensitivity and is commonly reported as typical of elders at about age 80. 3:1 is the level ISO 9241-3 and ANSI-HFES-100-1988 recommend for standard text and vision. Read 2026-10-14 through a page fetch, a second person confirms on the page. Full page title: Understanding Success Criterion 1.4.3: Contrast (Minimum)",
    source: "World Wide Web Consortium (W3C), Contrast (Minimum)",
    dateRead: "2026-10-14",
    readStatus: "excerpt",
    excerptVerified: true
  },
  {
    id: "F03",
    plain:
      "Larger, bolder text has thicker strokes, so it is easier to read and the minimum is lower. Text counts as large at 24 pixels, or about 18.5 pixels if it is bold.",
    reviewerNote:
      "W3C: 18 point is 24 pixels and 14 point bold is about 18.5 pixels. Bold is weight 700 or more. Earlier wording said 18.7 and 18.67, which was wrong. Full page title: Understanding Success Criterion 1.4.3: Contrast (Minimum)",
    source: "World Wide Web Consortium (W3C), Contrast (Minimum)",
    dateRead: "2026-10-07",
    readStatus: "full",
    excerptVerified: true
  },
  {
    id: "F04",
    plain:
      "Text that is purely decoration, part of a logo, or on a disabled control has no contrast minimum. Text that carries information does.",
    reviewerNote:
      "The exceptions are decorative, logotype and inactive component text. Full page title: Understanding Success Criterion 1.4.3: Contrast (Minimum)",
    source: "World Wide Web Consortium (W3C), Contrast (Minimum)",
    dateRead: "2026-10-07",
    readStatus: "full",
    excerptVerified: true
  },
  {
    id: "F05",
    plain:
      "Text on a photo, a gradient, or a semi-transparent layer still needs enough contrast. Check the place where it is weakest.",
    reviewerNote:
      "Same WebAIM article as F06, F13 and F14 (full title: Contrast and Color Accessibility: Understanding WCAG 2 Contrast and Color Requirements). Section: Evaluating Contrast and Color Use. The source line uses the short title so participants never see the banned term",
    source: "WebAIM, Contrast and Color Accessibility",
    dateRead: "2026-10-07",
    readStatus: "full",
    excerptVerified: true
  },
  {
    id: "F06",
    plain: "Lowering opacity makes text fainter, because the color behind it shows through.",
    reviewerNote:
      "Avene's own deferred card lost contrast to this when dimmed with half opacity. Same WebAIM article as F05, short title in the source line",
    source: "WebAIM, Contrast and Color Accessibility",
    dateRead: "2026-10-07",
    readStatus: "full",
    excerptVerified: true
  },
  {
    id: "F07",
    plain:
      "Small, faint, or hard-to-enlarge text is hard to read for many people with low vision. For people with cataracts, which can make everything look hazy, contrast matters most in bright light.",
    reviewerNote: "",
    source: "WebAIM, Visual Disabilities: Low Vision",
    dateRead: "2026-10-07",
    readStatus: "full",
    excerptVerified: true
  },
  {
    id: "F08",
    plain:
      "Pure black on white can feel harsh to some readers. The aim is text that is comfortable and still clears the minimum.",
    reviewerNote: "",
    source: "WebAIM, Visual Disabilities: Low Vision",
    dateRead: "2026-10-07",
    readStatus: "full",
    excerptVerified: true
  },
  {
    id: "F09",
    plain: "Hard-to-read text causes eye strain, and research has shown people trust it less.",
    reviewerNote:
      "Sherwin, K. (2015, June 7), Nielsen Norman Group: users get eye strain trying to decipher the words and are less trusting of text that is hard to read. Supported as written. Read 2026-10-14 through a page fetch, a second person confirms on the page",
    source: "Nielsen Norman Group, Low-Contrast Text Is Not the Answer (2015)",
    dateRead: "2026-10-14",
    readStatus: "excerpt",
    excerptVerified: true
  }
];

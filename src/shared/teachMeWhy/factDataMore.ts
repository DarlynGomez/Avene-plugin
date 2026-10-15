import type { Fact } from "./explanationTypes";

export const FACTS_TWO: readonly Fact[] = [
  {
    id: "F10",
    plain:
      "Low contrast can also make text extremely hard to use for people with cognitive conditions that affect short-term memory or attention, and faint treatments can send the wrong signal that an option is unavailable.",
    reviewerNote:
      "Sherwin, K. (2015, June 7), Nielsen Norman Group. Reworded: the article says cognitive conditions that impact short-term memory and make hard-to-see text extremely difficult, and that low contrast risks signalling an option is unavailable. The phrases faint labels and difficulty focusing are not in the article. Second person confirms on the page",
    source: "Nielsen Norman Group, Low-Contrast Text Is Not the Answer (2015)",
    dateRead: "2026-10-14",
    readStatus: "excerpt",
    excerptVerified: true
  },
  {
    id: "F11",
    plain:
      "For text over an image, darkening the image with a semi-transparent overlay or gradient, or blurring part of the photo, can lift contrast. A text shadow or outline is another option.",
    reviewerNote:
      "Harley, A. (2015, October 18), Nielsen Norman Group. Says an overlay darkens without drastically changing the tone, that blur alters some aesthetics and branding, and names text shadow or outline only in its conclusion with no claim about how they look. Plain text kept to those claims. KEEP OUT OF THE STUDY: the plugin measures flat color and these fixes do not change that. Exclude by id in code, not only by this note. Second person confirms on the page",
    source: "Nielsen Norman Group, Ensure High Contrast for Text Over Images (2015)",
    dateRead: "2026-10-14",
    readStatus: "excerpt",
    excerptVerified: true
  },
  {
    id: "F12",
    plain: "Orange, yellow, and light gray are the shades to check most carefully.",
    reviewerNote: "WebAIM, n.d.",
    source: "WebAIM, Web Accessibility for Designers",
    dateRead: "2026-10-07",
    readStatus: "full",
    excerptVerified: true
  },
  {
    id: "F13",
    plain:
      "Color can reinforce meaning, but it should not be the only visual way to communicate information, indicate actions, or tell elements apart.",
    reviewerNote:
      "WebAIM, 2021 January 9 version. Full title: Contrast and Color Accessibility: Understanding WCAG 2 Contrast and Color Requirements. Short title in the source line so participants never see the banned term",
    source: "WebAIM, Contrast and Color Accessibility",
    dateRead: "2026-10-07",
    readStatus: "full",
    excerptVerified: true
  },
  {
    id: "F14",
    plain:
      "Icons and the parts of a graphic needed to understand it need at least 3:1 against the colors next to them.",
    reviewerNote:
      "Not in any row of the matrix yet. Same WebAIM article as F13, short title in the source line. Changed from must have to need at least to avoid rule language",
    source: "WebAIM, Contrast and Color Accessibility",
    dateRead: "2026-10-07",
    readStatus: "full",
    excerptVerified: true
  },
  {
    id: "F15",
    plain:
      "In WebAIM's 2026 analysis of one million home pages, low-contrast text was the most common accessibility issue, appearing on 83.9% of pages, with an average of 34 instances per page.",
    reviewerNote:
      "Measures web home pages, not designs, and is reviewed each February. Use only one of F15 and F18 in a single explanation",
    source: "WebAIM, The WebAIM Million 2026",
    dateRead: "2026-10-07",
    readStatus: "full",
    excerptVerified: true
  },
  {
    id: "F16",
    plain:
      "Everyday conditions, such as bright sunlight, sunglasses, screen glare, and automatic brightness adjustments, can affect how easily people read content on mobile devices. Research on situational visual impairments examines how environmental conditions and on-screen content design relate to these difficulties.",
    reviewerNote:
      "Read in the thesis text 2026-10-14: sunlight (92 mentions), sunglasses (4), glare and reflections (54), auto-brightness slow to adjust, power saving mode lowering brightness, and the statement that content on screen affects bright-light situational impairments with care for color and contrast. The thesis does not say low contrast makes them worse in so many words, and only 7 mentions named design, so the plain text only says the research examines the relationship",
    source:
      "Tigwell, Improving Content Design on Mobile Devices to Reduce Situational Visual Impairments (PhD thesis, 2019)",
    dateRead: "2026-10-14",
    readStatus: "excerpt",
    excerptVerified: true
  },
  {
    id: "F17",
    plain:
      "One accessibility practitioner recounted that designers had used light, low-contrast colors to make less important information seem less prominent. Their perspective changed after a user study in which a customer with low vision could not read the footer text, even when the page was displayed on an enormous monitor, and had to rely on a screen reader.",
    reviewerNote:
      "Azenkot, Hanley and Baker (CSCW 2021, page 19, participant J1): designers felt light, low contrast colors best conveyed less important information, and were convinced after a user study with a customer with low vision who could not read the footer text on an enormous monitor and had to use a screen reader. One practitioner's account: present it as a story, never as a statistic",
    source:
      "How Accessibility Practitioners Promote the Creation of Accessible Products in Large Companies (CSCW 2021)",
    dateRead: "2026-10-14",
    readStatus: "excerpt",
    excerptVerified: true
  },
  {
    id: "F18",
    plain:
      "Across WebAIM's annual analyses of one million home pages from 2019 to 2026, low-contrast text appeared on approximately 79% to 86% of pages each year.",
    reviewerNote:
      "WebAIM Million 2026 yearly series (2019 to 2026): 85.3, 86.3, 86.4, 83.9, 83.6, 81, 79.1, 83.9. Low point 79.1 (2025), high point 86.4. Web home pages, not designs. Use only one of F15 and F18 in a single explanation",
    source: "WebAIM, The WebAIM Million 2026",
    dateRead: "2026-10-14",
    readStatus: "full",
    excerptVerified: true
  },
  {
    id: "F19",
    plain:
      "In a study of how users perceive colors on their own screens, an example website and infographic became almost entirely illegible for the 10% of participants who had the greatest difficulty distinguishing colors.",
    reviewerNote:
      "Reinecke et al., CHI 2016 (ColorCheck): for 10% of participants the example website and infographic became almost entirely illegible",
    source: "Enabling Designers to Foresee Which Colors Users Cannot See (CHI 2016)",
    dateRead: "2026-10-14",
    readStatus: "excerpt",
    excerptVerified: true
  },
  {
    id: "F20",
    plain:
      "In a study of how users perceive colors on their own screens, participants in the group that perceived colors least accurately were older on average and more likely to be outdoors during the study than other participants.",
    reviewerNote:
      "ColorCheck: worst 10% group outdoors 30.05% vs 23.14%, ambient brightness 53.81 vs 47.10, mean age 40.29 vs 30.21, lower monitor brightness. Correlation only, never say outdoors causes it. Numbers deliberately kept out of the plain text",
    source: "Enabling Designers to Foresee Which Colors Users Cannot See (CHI 2016)",
    dateRead: "2026-10-14",
    readStatus: "excerpt",
    excerptVerified: true
  },
  {
    id: "F21",
    plain:
      "In the ColorCheck study, the researchers estimated that roughly 20% of users might not be able to tell certain color-coded interface elements apart, such as the social media buttons in their example.",
    reviewerNote:
      "ColorCheck: at the 80% threshold 20% could not tell the social media buttons apart, so roughly 20% of users might miss the opportunity to browse all topics. The 80% is left out of the plain text on purpose to keep one number. About color differences between elements, not text contrast, so offer it only for button text rows",
    source: "Enabling Designers to Foresee Which Colors Users Cannot See (CHI 2016)",
    dateRead: "2026-10-14",
    readStatus: "excerpt",
    excerptVerified: true
  },
  {
    id: "F22",
    plain:
      "In interviews and a survey involving 70 creators, researchers found that some participants incorporated accessibility more naturally when they approached design requirements as creative constraints, while others described how unrestricted aesthetic freedom could lead accessibility to be overlooked.",
    reviewerNote:
      "Andrew, Callis, Ross, Tigwell, ASSETS 2025: 70 creators (34 professionals, 36 students). Findings from interviews and a survey, not a controlled test. Do not offer together with F23, they repeat the same opening",
    source: "Reframing Accessibility from Constraint to Creative Catalyst (ASSETS 2025)",
    dateRead: "2026-10-14",
    readStatus: "excerpt",
    excerptVerified: true
  },
  {
    id: "F23",
    plain:
      'In a study of creators, one creator described accessibility as a "guard rail" rather than a constraint, explaining that it adds to the creative problems designers need to solve.',
    reviewerNote:
      'Participant P6, verbatim: "Though not a constraint, its still a guard rail to follow. That adds to creative problems to solve." One person\'s account: present it as a story, never as a statistic. Opening shortened from the earlier version so it does not repeat F22. Do not offer together with F22',
    source: "Reframing Accessibility from Constraint to Creative Catalyst (ASSETS 2025)",
    dateRead: "2026-10-14",
    readStatus: "excerpt",
    excerptVerified: true
  },
  {
    id: "F24",
    plain:
      "Accessibility is often addressed later in the design process, and correcting accessibility issues at a late stage can increase project costs.",
    reviewerNote:
      "ACE, Tigwell et al., ACM TACCESS 2017, citing Henry and Arch 2012 for the cost point. A secondary citation: attribute it to the paper, no measured figure",
    source: "ACE: A Colour Palette Design Tool for Balancing Aesthetics and Accessibility (2017)",
    dateRead: "2026-10-14",
    readStatus: "excerpt",
    excerptVerified: true
  },
  {
    id: "F25",
    plain:
      "In their 2017 discussion of color palette tools, the ACE researchers noted that existing tools tended to emphasize either aesthetic qualities or accessibility rather than addressing both together.",
    reviewerNote:
      "ACE (2017) related work. Describes tools of that time. STUDY FRAMING ONLY: do not offer to the model. Exclude by id in code",
    source: "ACE: A Colour Palette Design Tool for Balancing Aesthetics and Accessibility (2017)",
    dateRead: "2026-10-14",
    readStatus: "excerpt",
    excerptVerified: true
  }
];

export const INTRO_HINTS = [
  "It looks like you're trying to send a message. Would you like a Compliance Officer to ruin your career?",
  "It looks like you're using a keyboard. Would you like to reconsider?",
  "It looks like you have something to say. We strongly advise against that.",
];

export const IDLE_HINTS = [
  "It looks like you're not typing anything aggressive. That itself is suspicious.",
  "Tip: Replying within 24 hours signals to leadership that you have nothing better to do.",
  "Reminder: 'Reply All' is a privilege, not a right.",
  "Hot take: 'Per my last email' is, legally speaking, a love letter.",
  "Did you know? 73% of HR complaints begin with the word 'Honestly'.",
  "Reminder: This software was last updated in 1995. We are doing our best.",
  "Pro tip: Adding 'Just wanted to circle back' makes any email 11% more enraging.",
];

export const KEYWORD_HINTS = [
  {
    test: /\bASAP\b/i,
    message: "It looks like you wrote 'ASAP'. Studies show this raises HR risk by 12%.",
  },
  {
    test: /\b(literally|honestly|frankly)\b/i,
    message: "It looks like you're about to be honest. Reconsider.",
  },
  {
    test: /\bper my last email\b/i,
    message: "Excellent. 'Per my last email' has been on the corporate-approved passive-aggression list since 1994.",
  },
  {
    test: /!{2,}/,
    message: "Multiple exclamation points detected. Please consult your Aggression Quota.",
  },
  {
    test: /[A-Z]{6,}/,
    message: "Sustained capitalization detected. This is, in writing, the equivalent of yelling.",
  },
  {
    test: /\bcircle back\b/i,
    message: "'Circle back' acknowledged. The circle is, as always, a metaphor for futility.",
  },
];

export const HIGH_DANGER_HINTS = [
  "It looks like you're writing a hostile communication. Would you like me to suggest a softer tone?",
  "I see we've graduated to 'PIP Pipeline' territory. Have you considered a walk?",
  "Bold choice. I will note your bravery in the permanent record.",
];

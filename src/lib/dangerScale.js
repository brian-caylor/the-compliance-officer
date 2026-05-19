export const DANGER_SCALE = [
  { level: 1,  label: "Casual Friday",         colorClass: "danger-low" },
  { level: 2,  label: "Watercooler Worthy",    colorClass: "danger-low" },
  { level: 3,  label: "Reply-All Regret",      colorClass: "danger-low" },
  { level: 4,  label: "Skip-Level Escalation", colorClass: "danger-mid" },
  { level: 5,  label: "Glassdoor Material",    colorClass: "danger-mid" },
  { level: 6,  label: "HR Knock-Knock",        colorClass: "danger-mid" },
  { level: 7,  label: "PIP Pipeline",          colorClass: "danger-high" },
  { level: 8,  label: "Walk of Shame",         colorClass: "danger-high" },
  { level: 9,  label: "Box of Stuff",          colorClass: "danger-high" },
  { level: 10, label: "Class Action",          colorClass: "danger-max" },
];

export function getDangerEntry(level) {
  const clamped = Math.max(1, Math.min(10, Math.round(level || 1)));
  return DANGER_SCALE[clamped - 1];
}

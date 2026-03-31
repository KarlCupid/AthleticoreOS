const EXACT_REPLACEMENTS: Record<string, string> = {
  "Following the scheduled plan.": 'This fits your plan today.',
  "Following the scheduled training plan.": 'This fits your plan today.',
  "Log your readiness to generate today's recommendations.": "Check in so we can show today's plan.",
  "Complete your check-in to unlock today's plan.": "Complete your check-in to see today's plan.",
  'Hit your targets today.': 'Stay on top of your food today.',
  'All systems green.': 'You are good to train today.',
};

const PATTERN_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\btraining load\b/gi, 'workload'],
  [/\bload ratio\b/gi, 'workload trend'],
  [/\brecommendations?\b/gi, 'plan'],
  [/\bpre-session\b/gi, 'pre-workout'],
  [/\bpost-session\b/gi, 'post-workout'],
  [/\bsessions\b/gi, 'workouts'],
  [/\bsession\b/gi, 'workout'],
  [/\bsafe minimum for this training level\b/gi, 'safe minimum for the work you are doing'],
  [/\bminimum for your training load\b/gi, "minimum for today's workload"],
  [/\bfueling is required today\b/gi, 'you need to eat enough today'],
];

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function ensureSentence(text: string): string {
  const trimmed = normalizeWhitespace(text).replace(/[.!?]+$/, '');
  if (!trimmed) return '';
  return `${trimmed}.`;
}

export function humanizeCoachCopy(raw: string | null | undefined): string {
  const trimmed = normalizeWhitespace(raw ?? '');
  if (!trimmed) return '';

  let text = EXACT_REPLACEMENTS[trimmed] ?? trimmed;
  for (const [pattern, replacement] of PATTERN_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return normalizeWhitespace(text);
}

export function humanizeCoachSentence(raw: string | null | undefined, fallback?: string): string {
  const primary = normalizeWhitespace(raw ?? '');
  const source = primary || normalizeWhitespace(fallback ?? '');
  if (!source) return '';

  const firstSentence = source.match(/[^.!?]+[.!?]?/)?.[0] ?? source;
  return ensureSentence(humanizeCoachCopy(firstSentence));
}

import type { DecisionTraceItem } from '../types/mission.ts';
import type { DecisionReasonViewModel } from './types.ts';
import { humanizeCoachSentence } from './coachCopy.ts';

const IMPACT_PRIORITY: Record<DecisionReasonViewModel['impact'], number> = {
  escalated: 4,
  restricted: 3,
  adjusted: 2,
  kept: 1,
};

const FALLBACK: DecisionReasonViewModel = {
  subsystem: 'training',
  title: 'Plan on track',
  sentence: 'This fits your plan today.',
  impact: 'kept',
};

function toSentence(raw: string): string {
  return humanizeCoachSentence(raw, FALLBACK.sentence);
}

function itemToViewModel(item: DecisionTraceItem): DecisionReasonViewModel {
  const raw = item.humanInterpretation ?? item.detail;
  return {
    subsystem: item.subsystem,
    title: item.title,
    sentence: toSentence(raw),
    impact: item.impact,
  };
}

export function getPrimaryDecisionReason(trace: DecisionTraceItem[]): DecisionReasonViewModel {
  if (trace.length === 0) return FALLBACK;
  const sorted = [...trace].sort(
    (a, b) => IMPACT_PRIORITY[b.impact] - IMPACT_PRIORITY[a.impact],
  );
  return itemToViewModel(sorted[0]);
}

export function getDecisionReason(
  trace: DecisionTraceItem[],
  subsystem: DecisionTraceItem['subsystem'],
  fallbackSentence?: string,
): DecisionReasonViewModel {
  const match = trace.find((item) => item.subsystem === subsystem);
  if (match) return itemToViewModel(match);
  return {
    ...FALLBACK,
    subsystem,
    sentence: fallbackSentence ?? FALLBACK.sentence,
  };
}

export function getAllDecisionReasons(trace: DecisionTraceItem[]): DecisionReasonViewModel[] {
  return trace.map(itemToViewModel);
}

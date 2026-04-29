import {
  confidenceFromLevel,
  createUnknownBodyMassState,
  normalizeBodyMass,
  type BodyMassState,
} from '../../performance-engine/index.ts';

export function buildDailyBodyMassState(input: {
  currentWeightLbs: number | null;
  date: string;
}): BodyMassState {
  const confidence = confidenceFromLevel(input.currentWeightLbs != null ? 'medium' : 'unknown', [
    input.currentWeightLbs != null ? 'Current body mass came from athlete context.' : 'Current body mass is missing.',
  ]);
  const current = input.currentWeightLbs != null
    ? normalizeBodyMass({
      value: input.currentWeightLbs,
      fromUnit: 'lb',
      toUnit: 'lb',
      measuredOn: input.date,
      confidence,
    })
    : null;

  return {
    ...createUnknownBodyMassState('lb'),
    current,
    missingFields: current ? [] : [{ field: 'current_body_mass', reason: 'not_collected' }],
    confidence,
  };
}

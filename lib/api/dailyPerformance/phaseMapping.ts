import type { Phase } from '../../engine/index.ts';
import type { AthleticorePhase } from '../../performance-engine/index.ts';

export function mapLegacyPhaseToUnifiedPhase(phase: Phase): AthleticorePhase {
  switch (phase) {
    case 'fight-camp':
    case 'camp-base':
    case 'camp-build':
    case 'camp-peak':
      return 'camp';
    case 'camp-taper':
      return 'competition_week';
    case 'pre-camp':
      return 'weight_class_management';
    case 'off-season':
    default:
      return 'build';
  }
}

export function trainingBackgroundFromFitnessLevel(value: string) {
  if (value === 'beginner') return 'recreational' as const;
  if (value === 'advanced') return 'competitive' as const;
  if (value === 'elite') return 'professional' as const;
  return 'competitive' as const;
}

import type { WorkoutTaxonomyItem } from '../../types.ts';

export const workoutTypes = [
  {
    "id": "strength",
    "label": "Strength",
    "summary": "Force production with controlled rest and technically crisp sets."
  },
  {
    "id": "hypertrophy",
    "label": "Hypertrophy",
    "summary": "Muscle-building volume with moderate load and repeatable effort."
  },
  {
    "id": "zone2_cardio",
    "label": "Zone 2 Cardio",
    "summary": "Easy aerobic work that supports recovery and repeatability."
  },
  {
    "id": "mobility",
    "label": "Mobility",
    "summary": "Controlled range-of-motion work without chasing fatigue."
  },
  {
    "id": "recovery",
    "label": "Recovery",
    "summary": "Low-stress work that downshifts the system and tracks symptoms."
  },
  {
    "id": "conditioning",
    "label": "Conditioning",
    "summary": "Structured intervals or circuits with explicit density."
  },
  {
    "id": "power",
    "label": "Power",
    "summary": "Explosive low-volume work that prioritizes speed and quality."
  },
  {
    "id": "core_durability",
    "label": "Core Durability",
    "summary": "Trunk control, bracing, anti-rotation, and carry capacity."
  },
  {
    "id": "upper_strength",
    "label": "Upper Strength",
    "summary": "Upper-body push and pull strength work."
  },
  {
    "id": "lower_strength",
    "label": "Lower Strength",
    "summary": "Lower-body squat, hinge, and unilateral strength work."
  },
  {
    "id": "full_body_strength",
    "label": "Full-Body Strength",
    "summary": "Balanced strength exposure for the whole body."
  },
  {
    "id": "low_impact_conditioning",
    "label": "Low-Impact Conditioning",
    "summary": "Conditioning that avoids jumping and hard landings."
  },
  {
    "id": "bodyweight_strength",
    "label": "Bodyweight Strength",
    "summary": "Strength work using body mass and simple supports."
  },
  {
    "id": "boxing_support",
    "label": "Boxing Support",
    "summary": "S&C support for punch mechanics, footwork, and trunk resilience."
  },
  {
    "id": "boxing_progression",
    "label": "Boxing Progression",
    "summary": "Low-risk technical movement, shadowboxing, footwork, and rhythm support."
  },
  {
    "id": "roadwork_tempo",
    "label": "Roadwork Tempo",
    "summary": "Controlled aerobic power and pacing work."
  },
  {
    "id": "roadwork_intervals",
    "label": "Roadwork Intervals",
    "summary": "High-control running intervals for athletes ready for the dose."
  },
  {
    "id": "boxing_conditioning_support",
    "label": "Boxing Conditioning Support",
    "summary": "Conditioning that supports boxing rounds without generating sparring."
  },
  {
    "id": "boxing_durability",
    "label": "Boxing Durability",
    "summary": "Trunk, shoulder, hip, ankle, neck/trap-adjacent, and hand/wrist durability support."
  },
  {
    "id": "assessment",
    "label": "Assessment",
    "summary": "Repeatable measures of strength, conditioning, mobility, and symptoms."
  }
] satisfies WorkoutTaxonomyItem[];

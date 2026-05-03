import type { WorkoutTaxonomyItem } from '../../types.ts';

export const workoutFormats = [
  {
    "id": "straight_sets",
    "label": "Straight Sets",
    "summary": "Complete all sets before moving to the next movement."
  },
  {
    "id": "superset",
    "label": "Superset",
    "summary": "Pair compatible movements to save time."
  },
  {
    "id": "circuit",
    "label": "Circuit",
    "summary": "Rotate through movements for multiple rounds."
  },
  {
    "id": "emom",
    "label": "EMOM",
    "summary": "Start prescribed work every minute on the minute."
  },
  {
    "id": "amrap",
    "label": "AMRAP",
    "summary": "Complete repeatable quality work inside a time box."
  },
  {
    "id": "intervals",
    "label": "Intervals",
    "summary": "Alternate work and recovery intervals."
  },
  {
    "id": "steady_state",
    "label": "Steady State",
    "summary": "Sustain a stable aerobic effort."
  },
  {
    "id": "mobility_flow",
    "label": "Mobility Flow",
    "summary": "Move continuously through controlled positions."
  },
  {
    "id": "recovery_flow",
    "label": "Recovery Flow",
    "summary": "Low-stress sequence for breathing, mobility, and easy movement."
  },
  {
    "id": "density_block",
    "label": "Density Block",
    "summary": "Accumulate quality work inside a fixed block."
  },
  {
    "id": "ramp_sets",
    "label": "Ramp Sets",
    "summary": "Build gradually toward working sets."
  },
  {
    "id": "time_cap",
    "label": "Time Cap",
    "summary": "Stop at the cap even if all work is not complete."
  },
  {
    "id": "skill_practice",
    "label": "Skill Practice",
    "summary": "Quality-first reps with generous rest."
  },
  {
    "id": "tempo_sets",
    "label": "Tempo Sets",
    "summary": "Use tempo to control joint stress and execution quality."
  },
  {
    "id": "checklist",
    "label": "Checklist",
    "summary": "Complete a short list of recovery or assessment tasks."
  }
] satisfies WorkoutTaxonomyItem[];

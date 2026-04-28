export const APP_IMPACTS = [
  {
    icon: 'Fuel',
    feature: 'Nutrition',
    timing: 'Day 1',
    color: '#B7D9A8',
    bg: 'rgba(183, 217, 168, 0.12)',
    detail:
      'Nutrition targets stay tied to training demand, recovery, and weight-class feasibility. Unsafe under-fueling pressure is blocked.',
  },
  {
    icon: 'H2O',
    feature: 'Hydration',
    timing: 'Day 1',
    color: '#B8C0C2',
    bg: 'rgba(184, 192, 194, 0.12)',
    detail:
      'Fluid and electrolyte guidance stays steady and familiar. The app does not create acute scale-based fluid tactics.',
  },
  {
    icon: 'S&C',
    feature: 'S&C Training',
    timing: 'Day 1',
    color: '#D4AF37',
    bg: 'rgba(212, 175, 55, 0.12)',
    detail:
      'Training works around the body-mass context, readiness, protected workouts, and fight proximity without chasing the scale.',
  },
  {
    icon: 'Data',
    feature: 'Dashboard',
    timing: 'Day 1',
    color: '#D4AF37',
    bg: 'rgba(245, 245, 240, 0.08)',
    detail:
      'Fight timing and weight-class feasibility update the continuous athlete journey without restarting the plan.',
  },
] as const;

export const BODY_MASS_PHASES = [
  {
    label: 'Long-Term Management',
    when: '8+ weeks out',
    color: '#D4AF37',
    bg: 'rgba(212, 175, 55, 0.12)',
    description:
      'Gradual body-composition work with normal fueling, trend monitoring, and no acute fight-week shortcuts.',
  },
  {
    label: 'Weight-Class Prep',
    when: '2-8 weeks out',
    color: '#B7D9A8',
    bg: 'rgba(183, 217, 168, 0.12)',
    description:
      'Feasibility is checked against the timeline, readiness, nutrition confidence, and body-mass trend.',
  },
  {
    label: 'Fight Week',
    when: '7 days out',
    color: '#D4AF37',
    bg: 'rgba(245, 245, 240, 0.08)',
    description:
      'Competition-week body-mass monitoring preserves familiar foods, steady fluids, and visible safety warnings.',
  },
  {
    label: 'Post Weigh-In Recovery',
    when: 'After weigh-in',
    color: '#B7D9A8',
    bg: 'rgba(183, 217, 168, 0.12)',
    description: 'Recovery tracking uses familiar foods, steady fluids, gut comfort, and symptom monitoring.',
  },
] as const;

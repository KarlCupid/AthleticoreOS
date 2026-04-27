export const APP_IMPACTS = [
  {
    icon: 'Fuel',
    feature: 'Nutrition',
    timing: 'Day 1',
    color: '#B7D9A8',
    bg: 'rgba(183, 217, 168, 0.12)',
    detail:
      'Macro targets recalculate daily based on your current cut phase. Calories, protein, carbs, and fat all adjust automatically, and refeed days are scheduled when needed.',
  },
  {
    icon: 'H2O',
    feature: 'Hydration',
    timing: 'Day 1',
    color: '#B8C0C2',
    bg: 'rgba(184, 192, 194, 0.12)',
    detail:
      'Daily water targets update based on your cut phase. Fight week adds conservative hydration and sodium guardrails with visible safety warnings.',
  },
  {
    icon: 'S&C',
    feature: 'S&C Training',
    timing: 'Day 1',
    color: '#D4AF37',
    bg: 'rgba(212, 175, 55, 0.12)',
    detail:
      'Prescribed workouts and training intensity are capped based on your current cut phase. Harder cuts reduce intensity to protect recovery.',
  },
  {
    icon: 'Data',
    feature: 'Dashboard',
    timing: 'Day 1',
    color: '#D4AF37',
    bg: 'rgba(245, 245, 240, 0.08)',
    detail:
      'Your phase switches into fight camp automatically when the fight is 12 weeks away or closer. Readiness reflects cut progress and recovery pressure.',
  },
] as const;

export const CUT_PHASES = [
  {
    label: 'Chronic Phase',
    when: '8+ weeks out',
    color: '#D4AF37',
    bg: 'rgba(212, 175, 55, 0.12)',
    description:
      'Moderate caloric deficit with normal training loads. The goal is steady fat loss without compromising recovery.',
  },
  {
    label: 'Intensified Phase',
    when: '2-8 weeks out',
    color: '#B7D9A8',
    bg: 'rgba(183, 217, 168, 0.12)',
    description:
      'A larger deficit with macro cycling. Training intensity caps begin and refeed days help preserve performance.',
  },
  {
    label: 'Fight Week',
    when: '7 days out',
    color: '#D4AF37',
    bg: 'rgba(245, 245, 240, 0.08)',
    description:
      'Conservative hydration, sodium, and low-residue guidance. Training volume drops sharply, and warnings stay visible when risk is elevated.',
  },
  {
    label: 'Rehydration',
    when: 'After weigh-in',
    color: '#B7D9A8',
    bg: 'rgba(183, 217, 168, 0.12)',
    description: 'Rapid rehydration and carb restoration to rebuild performance before fight time.',
  },
] as const;

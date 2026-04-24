export const APP_IMPACTS = [
  {
    icon: 'Fuel',
    feature: 'Nutrition',
    timing: 'Day 1',
    color: '#B7D9A8',
    bg: '#F0FDF4',
    detail:
      'Macro targets recalculate daily based on your current cut phase. Calories, protein, carbs, and fat all adjust automatically, and refeed days are scheduled when needed.',
  },
  {
    icon: 'H2O',
    feature: 'Hydration',
    timing: 'Day 1',
    color: '#0EA5E9',
    bg: '#F0F9FF',
    detail:
      'Daily water targets update based on your cut phase. Fight week adds a structured sodium and fluid protocol to support the final water cut.',
  },
  {
    icon: 'S&C',
    feature: 'S&C Training',
    timing: 'Day 1',
    color: '#15803D',
    bg: '#F5F3FF',
    detail:
      'Prescribed workouts and training intensity are capped based on your current cut phase. Harder cuts reduce intensity to protect recovery.',
  },
  {
    icon: 'Data',
    feature: 'Dashboard',
    timing: 'Day 1',
    color: '#D4AF37',
    bg: '#F5F5F0BEB',
    detail:
      'Your phase switches into fight camp automatically when the fight is 12 weeks away or closer. Readiness reflects cut progress and recovery pressure.',
  },
] as const;

export const CUT_PHASES = [
  {
    label: 'Chronic Phase',
    when: '8+ weeks out',
    color: '#D4AF37',
    bg: '#EFF6FF',
    description:
      'Moderate caloric deficit with normal training loads. The goal is steady fat loss without compromising recovery.',
  },
  {
    label: 'Intensified Phase',
    when: '2-8 weeks out',
    color: '#15803D',
    bg: '#F5F3FF',
    description:
      'A larger deficit with macro cycling. Training intensity caps begin and refeed days help preserve performance.',
  },
  {
    label: 'Fight Week',
    when: '7 days out',
    color: '#D4AF37',
    bg: '#F5F5F0BEB',
    description:
      'Sodium loading, depletion, and controlled fluid restriction. Training volume drops sharply while the water-cut protocol activates.',
  },
  {
    label: 'Rehydration',
    when: 'After weigh-in',
    color: '#B7D9A8',
    bg: '#F0FDF4',
    description: 'Rapid rehydration and carb restoration to rebuild performance before fight time.',
  },
] as const;

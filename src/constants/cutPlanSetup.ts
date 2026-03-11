export const APP_IMPACTS = [
    {
        icon: '🥗',
        feature: 'Nutrition',
        timing: 'Day 1',
        color: '#16A34A',
        bg: '#F0FDF4',
        detail: 'Macro targets recalculate daily based on your current cut phase — calories, protein, carbs, and fat are all adjusted. Refeed days are scheduled automatically.',
    },
    {
        icon: '💧',
        feature: 'Hydration',
        timing: 'Day 1',
        color: '#0EA5E9',
        bg: '#F0F9FF',
        detail: 'Daily water targets update based on your cut phase. Fight week triggers a specific sodium/fluid protocol to prime the water cut.',
    },
    {
        icon: '🏋️',
        feature: 'S&C Training',
        timing: 'Day 1',
        color: '#8B5CF6',
        bg: '#F5F3FF',
        detail: 'Prescribed workouts and training intensity are capped based on your current cut phase. Harder cuts = lower intensity to protect recovery.',
    },
    {
        icon: '📊',
        feature: 'Dashboard',
        timing: 'Day 1',
        color: '#F59E0B',
        bg: '#FFFBEB',
        detail: 'Your phase is set to Fight Camp automatically if the fight is ≤12 weeks out. Readiness score incorporates cut progress.',
    },
];

export const CUT_PHASES = [
    {
        label: 'Chronic Phase',
        when: '8+ weeks out',
        color: '#3B82F6',
        bg: '#EFF6FF',
        description: 'Moderate caloric deficit. Normal training loads. Goal is steady fat loss without taxing recovery.',
    },
    {
        label: 'Intensified Phase',
        when: '2–8 weeks out',
        color: '#8B5CF6',
        bg: '#F5F3FF',
        description: 'Larger deficit with macro cycling. Training intensity caps begin. Refeed days programmed to maintain performance.',
    },
    {
        label: 'Fight Week',
        when: '7 days out',
        color: '#F59E0B',
        bg: '#FFFBEB',
        description: 'Sodium loading then depletion. Controlled fluid restriction. Training volume drops sharply. Water cut protocol activates.',
    },
    {
        label: 'Rehydration',
        when: 'After weigh-in',
        color: '#16A34A',
        bg: '#F0FDF4',
        description: 'Rapid rehydration and carb reload to restore performance before fight day.',
    },
];

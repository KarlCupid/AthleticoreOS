import { WeightClass, WeightClassSuggestion, WeightClassRiskLevel, CutSport, FightStatus } from './types.ts';

/**
 * @ANTI-WIRING:
 * Pure static data + pure synchronous function. No database queries.
 *
 * Usage:
 *   suggestWeightClass({ currentWeight: 175, fightStatus: 'amateur', sport: 'mma' })
 */

// ─── Weight Class Reference Data ───────────────────────────────

const BOXING_AMATEUR: WeightClass[] = [
  { name: 'Minimumweight',      maxLbs: 106,  sport: 'boxing', level: 'amateur' },
  { name: 'Light Flyweight',    maxLbs: 108,  sport: 'boxing', level: 'amateur' },
  { name: 'Flyweight',          maxLbs: 112,  sport: 'boxing', level: 'amateur' },
  { name: 'Super Flyweight',    maxLbs: 115,  sport: 'boxing', level: 'amateur' },
  { name: 'Bantamweight',       maxLbs: 118,  sport: 'boxing', level: 'amateur' },
  { name: 'Super Bantamweight', maxLbs: 122,  sport: 'boxing', level: 'amateur' },
  { name: 'Featherweight',      maxLbs: 126,  sport: 'boxing', level: 'amateur' },
  { name: 'Super Featherweight',maxLbs: 130,  sport: 'boxing', level: 'amateur' },
  { name: 'Lightweight',        maxLbs: 135,  sport: 'boxing', level: 'amateur' },
  { name: 'Super Lightweight',  maxLbs: 140,  sport: 'boxing', level: 'amateur' },
  { name: 'Welterweight',       maxLbs: 147,  sport: 'boxing', level: 'amateur' },
  { name: 'Super Welterweight', maxLbs: 154,  sport: 'boxing', level: 'amateur' },
  { name: 'Middleweight',       maxLbs: 160,  sport: 'boxing', level: 'amateur' },
  { name: 'Super Middleweight', maxLbs: 168,  sport: 'boxing', level: 'amateur' },
  { name: 'Light Heavyweight',  maxLbs: 175,  sport: 'boxing', level: 'amateur' },
  { name: 'Cruiserweight',      maxLbs: 200,  sport: 'boxing', level: 'amateur' },
  { name: 'Heavyweight',        maxLbs: 201,  sport: 'boxing', level: 'amateur' }, // 200+ unlimited
];

const BOXING_PRO: WeightClass[] = BOXING_AMATEUR.map(w => ({ ...w, level: 'pro' as const }));

const MMA_AMATEUR: WeightClass[] = [
  { name: 'Atomweight',         maxLbs: 105,  sport: 'mma', level: 'amateur' },
  { name: 'Strawweight',        maxLbs: 115,  sport: 'mma', level: 'amateur' },
  { name: 'Flyweight',          maxLbs: 125,  sport: 'mma', level: 'amateur' },
  { name: 'Bantamweight',       maxLbs: 135,  sport: 'mma', level: 'amateur' },
  { name: 'Featherweight',      maxLbs: 145,  sport: 'mma', level: 'amateur' },
  { name: 'Lightweight',        maxLbs: 155,  sport: 'mma', level: 'amateur' },
  { name: 'Welterweight',       maxLbs: 170,  sport: 'mma', level: 'amateur' },
  { name: 'Middleweight',       maxLbs: 185,  sport: 'mma', level: 'amateur' },
  { name: 'Light Heavyweight',  maxLbs: 205,  sport: 'mma', level: 'amateur' },
  { name: 'Heavyweight',        maxLbs: 265,  sport: 'mma', level: 'amateur' },
];

const MMA_PRO: WeightClass[] = MMA_AMATEUR.map(w => ({ ...w, level: 'pro' as const }));

export const WEIGHT_CLASSES: Record<CutSport, Record<FightStatus, WeightClass[]>> = {
  boxing: { amateur: BOXING_AMATEUR, pro: BOXING_PRO },
  mma:    { amateur: MMA_AMATEUR,    pro: MMA_PRO },
};

// ─── suggestWeightClass ────────────────────────────────────────

export function suggestWeightClass(input: {
  currentWeight: number;
  fightStatus: FightStatus;
  sport: CutSport;
  maxSafeCutPct?: number;  // override; default = conservative review threshold
}): WeightClassSuggestion[] {
  const { currentWeight, fightStatus, sport } = input;
  const hardCutCapPct = input.maxSafeCutPct ?? (fightStatus === 'amateur' ? 6 : 8);
  const classes = WEIGHT_CLASSES[sport][fightStatus];

  const suggestions: WeightClassSuggestion[] = [];

  for (const wc of classes) {
    const cutRequired = currentWeight - wc.maxLbs;
    const cutPct = (cutRequired / currentWeight) * 100;

    if (cutRequired < -5) continue;  // moving UP by more than 5 lbs — skip (athlete is too light)

    let risk: WeightClassRiskLevel;
    let riskReason: string;
    let feasible: boolean;

    if (cutPct > hardCutCapPct) {
      risk = 'unsafe';
      riskReason = `Requires ${cutPct.toFixed(1)}% body-mass change, exceeding the ${hardCutCapPct}% automatic planning limit.`;
      feasible = false;
    } else if (cutPct > 4) {
      risk = 'high';
      riskReason = `${cutPct.toFixed(1)}% body-mass change needs a longer runway or qualified review.`;
      feasible = false;
    } else if (cutPct > 2) {
      risk = 'moderate';
      riskReason = `${cutPct.toFixed(1)}% body-mass change should be gradual and monitored.`;
      feasible = true;
    } else if (cutPct >= 0) {
      risk = 'low';
      riskReason = cutPct < 1 ? 'Essentially your natural weight class.' : `${cutPct.toFixed(1)}% body-mass change is small.`;
      feasible = true;
    } else {
      // Athlete is under the limit - no loss required (moving up or already in class)
      risk = 'low';
      riskReason = `You are ${Math.abs(cutRequired).toFixed(1)} lbs under the limit - no loss required.`;
      feasible = true;
    }

    const isCurrent = cutRequired >= 0 && cutRequired <= 5;

    suggestions.push({ weightClass: wc, cutRequired: Math.max(0, cutRequired), cutPct: Math.max(0, cutPct), feasible, isCurrent, risk, riskReason });

    // Once we've found the current class and one below + one above, cap at 5 suggestions
    if (suggestions.length >= 5) break;
  }

  // Sort by cut required ascending (smallest cut first = most natural class)
  return suggestions.sort((a, b) => Math.abs(a.cutRequired) - Math.abs(b.cutRequired)).slice(0, 4);
}

// ─── getWeightClassByName ──────────────────────────────────────

export function getWeightClassByName(
  name: string,
  sport: CutSport,
  level: FightStatus
): WeightClass | null {
  return WEIGHT_CLASSES[sport][level].find(wc => wc.name === name) ?? null;
}

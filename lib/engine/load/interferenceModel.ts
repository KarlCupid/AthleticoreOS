export type SessionType = 'HEAVY_STRENGTH' | 'POWER' | 'CONDITIONING' | 'SPARRING' | 'SKILL' | 'RECOVERY';

const DEFAULT_ROW: Record<SessionType, number> = {
  HEAVY_STRENGTH: 1,
  POWER: 1,
  CONDITIONING: 1,
  SPARRING: 1,
  SKILL: 1,
  RECOVERY: 1,
};

export const INTERFERENCE_MATRIX: Record<SessionType, Record<SessionType, number>> = {
  HEAVY_STRENGTH: { ...DEFAULT_ROW, SPARRING: 1.5, SKILL: 1.4, POWER: 1.2, CONDITIONING: 1.1 },
  POWER: { ...DEFAULT_ROW, SPARRING: 1.2, SKILL: 1.1, CONDITIONING: 1.05 },
  CONDITIONING: { ...DEFAULT_ROW, SPARRING: 1.3, SKILL: 1.2, HEAVY_STRENGTH: 1.1 },
  SPARRING: { ...DEFAULT_ROW, HEAVY_STRENGTH: 1.1, CONDITIONING: 1.1 },
  SKILL: { ...DEFAULT_ROW, HEAVY_STRENGTH: 1.1, CONDITIONING: 1.05 },
  RECOVERY: { ...DEFAULT_ROW },
};

export function getInterferencePenalty(
  precedingType: SessionType,
  followingType: SessionType,
  hoursBetween: number,
): number {
  const basePenalty = INTERFERENCE_MATRIX[precedingType][followingType] ?? 1;
  if (hoursBetween >= 12) return 1;
  const decayFactor = Math.max(0, hoursBetween) / 12;
  return 1 + (basePenalty - 1) * (1 - decayFactor);
}

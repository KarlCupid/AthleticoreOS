export interface PhaseAllocation {
  gpp: number;
  spp: number;
  peak: number;
  taper: number;
  shortCamp: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculatePhaseAllocation(campDays: number): PhaseAllocation {
  const taper = Math.round(clamp(campDays * 0.10, 5, 10));
  const peak = Math.round(clamp(campDays * 0.15, 5, 14));
  const remaining = Math.max(0, campDays - taper - peak);

  if (campDays <= 21) {
    return { gpp: 0, spp: remaining, peak, taper, shortCamp: true };
  }
  if (campDays <= 42) {
    const gpp = Math.floor(remaining * 0.25);
    return { gpp, spp: remaining - gpp, peak, taper, shortCamp: false };
  }

  const gpp = Math.floor(remaining * 0.55);
  return { gpp, spp: remaining - gpp, peak, taper, shortCamp: false };
}

# Engine Thresholds And Citations

This note keeps the engine's safety-sensitive thresholds in one place so they are not opaque magic numbers.

## ACWR

- Safe band target: `0.8-1.3`
- Caution clamp: `1.1-1.3`
- Redline cap: `1.5`
- Detrained band: `<0.8`
- Basis: the acute:chronic workload framing commonly cited in Hulin/Gabbett-style load-management literature. The engine clamps inside the band rather than encouraging athletes to live on the upper edge.

## Fight-Camp Energy Availability

- Default day-to-day floor when `daysToWeighIn > 7`: `25 kcal/kg FFM`
- Late-cut floor when `daysToWeighIn <= 7`: `23 kcal/kg FFM`
- Final 72h floor when `daysToWeighIn <= 3`: `20 kcal/kg FFM`
- Basis: combat-sport cut protection. `20` is treated as a short end-of-cut minimum, not a normal operating target.

## Biology-Aware Protein

- Off-season / general baseline: `1.0 g/lb`
- Fight-camp / taper baseline: `1.2 g/lb`
- Deficit uplift cap in camp: `+0.5 g/lb`
- Late-luteal protein modifier: `1.15` only when meaningful energy deficit is present (`>5%`)
- Basis: lean-mass protection during aggressive cuts without inflating maintenance or surplus plans.

## Camp Intensity And Deload

- Peak phase with concurrent cut: cap guided intensity at `RPE 7`
- Deload intensity cap: `RPE 5`
- Deload loading anchor: `67.5% e1RM`
- Basis: avoid stacking dehydration, glycogen depletion, and maximal neural strain in the same prescription window.

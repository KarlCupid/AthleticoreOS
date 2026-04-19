export function getSafetyThreshold(chronicLoad: number): {
  caution: number;
  redline: number;
  source: 'low_chronic' | 'standard_chronic' | 'high_chronic';
} {
  if (chronicLoad < 300) {
    return { caution: 1.24, redline: 1.4, source: 'low_chronic' };
  }
  if (chronicLoad < 900) {
    return { caution: 1.27, redline: 1.45, source: 'standard_chronic' };
  }
  return { caution: 1.28, redline: 1.5, source: 'high_chronic' };
}

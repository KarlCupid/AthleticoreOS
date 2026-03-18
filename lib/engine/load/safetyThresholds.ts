export function getSafetyThreshold(chronicLoad: number): {
  caution: number;
  redline: number;
  source: 'low_chronic' | 'standard_chronic' | 'high_chronic';
} {
  if (chronicLoad < 300) {
    return { caution: 1.2, redline: 1.32, source: 'low_chronic' };
  }
  if (chronicLoad < 600) {
    return { caution: 1.3, redline: 1.42, source: 'standard_chronic' };
  }
  return { caution: 1.5, redline: 1.62, source: 'high_chronic' };
}

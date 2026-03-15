export function calculateCaloriesFromMacros(
  protein: number,
  carbs: number,
  fat: number,
): number {
  return Math.round((protein * 4) + (carbs * 4) + (fat * 9));
}

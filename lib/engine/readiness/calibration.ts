export function calibrateBudgetValue(currentBudget: number, complianceHistory28d: number[]): number {
  if (complianceHistory28d.length === 0) return currentBudget;

  const avgCompliance = complianceHistory28d.reduce((sum, value) => sum + value, 0) / complianceHistory28d.length;
  const adjustment = avgCompliance >= 0.9 ? 3 : avgCompliance < 0.7 ? -3 : 0;
  return currentBudget + adjustment;
}

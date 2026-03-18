export function getRestDayDeficitRedistribution(input: {
  deficitBankDelta: number;
  remainingRestDays: number;
}): number {
  const { deficitBankDelta, remainingRestDays } = input;
  if (deficitBankDelta <= 0 || remainingRestDays <= 0) return 0;
  return Math.min(500, Math.round(deficitBankDelta / remainingRestDays));
}

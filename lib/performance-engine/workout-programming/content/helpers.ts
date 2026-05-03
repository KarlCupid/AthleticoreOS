export type IdentifiedContent = { id: string };

export function uniqueById<T extends IdentifiedContent>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function sortBySourceOrder<T extends IdentifiedContent>(items: T[], sourceOrder: IdentifiedContent[]): T[] {
  const order = new Map(sourceOrder.map((item, index) => [item.id, index]));
  return [...items].sort((left, right) => (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(right.id) ?? Number.MAX_SAFE_INTEGER));
}

export function hasAny(values: readonly string[] | undefined, targets: ReadonlySet<string>): boolean {
  return Boolean(values?.some((value) => targets.has(value)));
}

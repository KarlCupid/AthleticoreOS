/**
 * Shared test utilities for engine tests.
 * NOT a test file — imported by *.test.ts files.
 */

export let passed = 0;
export let failed = 0;

export function resetCounters() {
  passed = 0;
  failed = 0;
}

export function assert(label: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

export function assertClose(label: string, actual: number, expected: number, tolerance: number) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label} (got ${actual}, expected ~${expected} ±${tolerance})`);
  }
}

export function assertThrows(label: string, fn: () => void) {
  try {
    fn();
    failed++;
    console.error(`  FAIL ${label} (expected throw, but did not throw)`);
  } catch {
    passed++;
    console.log(`  PASS ${label}`);
  }
}

export function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalISO(d);
}

export function makeWeightHistory(
  startWeight: number,
  velocityPerDay: number,
  days: number,
  startDate: string = '2026-01-01'
): { date: string; weight: number }[] {
  const result: { date: string; weight: number }[] = [];
  for (let i = 0; i < days; i++) {
    result.push({
      date: addDays(startDate, i),
      weight: Math.round((startWeight + velocityPerDay * i) * 10) / 10,
    });
  }
  return result;
}

/**
 * Creates a mock Supabase client supporting chainable query methods.
 * tableData maps table names to arrays of rows.
 */
export function createMockSupabaseClient(tableData: Record<string, any[]>) {
  return {
    from: (table: string) => {
      const rows = tableData[table] ?? [];
      return buildChain(rows);
    },
  };
}

function buildChain(rows: any[]) {
  let filtered = [...rows];

  const chain: any = {
    select: (_fields?: string) => chain,
    eq: (col: string, val: any) => {
      filtered = filtered.filter((r) => r[col] === val);
      return chain;
    },
    neq: (col: string, val: any) => {
      filtered = filtered.filter((r) => r[col] !== val);
      return chain;
    },
    gte: (col: string, val: any) => {
      filtered = filtered.filter((r) => r[col] >= val);
      return chain;
    },
    lte: (col: string, val: any) => {
      filtered = filtered.filter((r) => r[col] <= val);
      return chain;
    },
    gt: (col: string, val: any) => {
      filtered = filtered.filter((r) => r[col] > val);
      return chain;
    },
    lt: (col: string, val: any) => {
      filtered = filtered.filter((r) => r[col] < val);
      return chain;
    },
    in: (col: string, vals: any[]) => {
      filtered = filtered.filter((r) => vals.includes(r[col]));
      return chain;
    },
    is: (col: string, val: any) => {
      filtered = filtered.filter((r) => r[col] === val);
      return chain;
    },
    order: (col: string, opts?: { ascending?: boolean }) => {
      const asc = opts?.ascending ?? true;
      filtered.sort((a, b) => {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
      return chain;
    },
    limit: (_n: number) => chain,
    single: () => Promise.resolve({ data: filtered[0] ?? null, error: null }),
    maybeSingle: () => Promise.resolve({ data: filtered[0] ?? null, error: null }),
    then: (resolve: any) => Promise.resolve({ data: filtered, error: null }).then(resolve),
  };

  return chain;
}

export function getResults() {
  return { passed, failed };
}

type SchemaCacheError = {
  code?: string;
  message?: string;
} | null | undefined;

type PostgrestLikeResponse<T> = {
  data?: T | null;
  error?: unknown;
};

export function getMissingSchemaCacheColumn(
  error: SchemaCacheError,
  table: string,
): string | null {
  if (!error?.message || error.code !== 'PGRST204') return null;

  const match = error.message.match(
    new RegExp(`Could not find the '([^']+)' column of '${table}'`, 'i'),
  );

  return match?.[1] ?? null;
}

export async function withOptionalColumnsMutationFallback<T>(
  table: string,
  optionalColumns: ReadonlySet<string>,
  initialPayload: Record<string, unknown>,
  execute: (payload: Record<string, unknown>) => PromiseLike<PostgrestLikeResponse<T>>,
): Promise<PostgrestLikeResponse<T>> {
  const payload = { ...initialPayload };
  let remainingFallbacks = optionalColumns.size;

  while (remainingFallbacks >= 0) {
    const response = await execute(payload);

    if (!response.error) return response;

    const missingColumn = getMissingSchemaCacheColumn(response.error, table);
    if (!missingColumn || !optionalColumns.has(missingColumn) || !(missingColumn in payload)) {
      return response;
    }

    delete payload[missingColumn];
    remainingFallbacks -= 1;
  }

  return execute(payload);
}

export async function withOptionalColumnsSelectFallback<T>(
  table: string,
  requiredColumns: string[],
  optionalColumns: string[],
  execute: (selectClause: string) => PromiseLike<PostgrestLikeResponse<T>>,
): Promise<PostgrestLikeResponse<T>> {
  let selectedOptionalColumns = [...optionalColumns];
  let remainingFallbacks = selectedOptionalColumns.length;

  while (remainingFallbacks >= 0) {
    const selectClause = [...requiredColumns, ...selectedOptionalColumns].join(', ');
    const response = await execute(selectClause);

    if (!response.error) return response;

    const missingColumn = getMissingSchemaCacheColumn(response.error, table);
    if (!missingColumn || !selectedOptionalColumns.includes(missingColumn)) {
      return response;
    }

    selectedOptionalColumns = selectedOptionalColumns.filter((column) => column !== missingColumn);
    remainingFallbacks -= 1;
  }

  return execute(requiredColumns.join(', '));
}

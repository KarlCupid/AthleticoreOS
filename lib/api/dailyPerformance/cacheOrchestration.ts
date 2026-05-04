export interface CacheOrchestrationInput<T> {
  cacheKey: string;
  forceRefresh?: boolean | undefined;
  cache: Map<string, T>;
  inFlight: Map<string, Promise<T>>;
  compute: () => Promise<T>;
}

export async function getOrComputeCachedValue<T>(input: CacheOrchestrationInput<T>): Promise<T> {
  if (!input.forceRefresh) {
    const cached = input.cache.get(input.cacheKey);
    if (cached) {
      return cached;
    }

    const inFlight = input.inFlight.get(input.cacheKey);
    if (inFlight) {
      return inFlight;
    }
  } else {
    input.cache.delete(input.cacheKey);
    input.inFlight.delete(input.cacheKey);
  }

  const request = input.compute()
    .then((result) => {
      input.cache.set(input.cacheKey, result);
      return result;
    })
    .finally(() => {
      input.inFlight.delete(input.cacheKey);
    });

  input.inFlight.set(input.cacheKey, request);
  return request;
}

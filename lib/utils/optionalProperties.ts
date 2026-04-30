type OptionalKeys<T extends object> = {
  [K in keyof T]-?: Record<string, never> extends Pick<T, K> ? K : never;
}[keyof T];

type ExplicitUndefinedForOptional<T extends object> =
  & {
    [K in keyof T as K extends OptionalKeys<T> ? never : K]: T[K];
  }
  & {
    [K in keyof T as K extends OptionalKeys<T> ? K : never]?: T[K] | undefined;
  };

export function omitUndefinedProperties<T extends object>(input: ExplicitUndefinedForOptional<T>): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as T;
}

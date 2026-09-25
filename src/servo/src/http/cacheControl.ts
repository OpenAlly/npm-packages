export interface CacheControlOptions {
  /**
   * Forces `no-cache`, `maxAge` is ignored.
   */
  dev?: boolean;
  maxAge?: number;
  immutable?: boolean;
}

export function cacheControl(
  options: CacheControlOptions
): string | null {
  const { dev = false, maxAge, immutable = false } = options;

  if (dev) {
    return "no-cache";
  }
  if (maxAge === undefined) {
    return null;
  }

  const seconds = Math.max(0, Math.floor(maxAge));
  const value = `public, max-age=${seconds}`;
  if (immutable) {
    return `${value}, immutable`;
  }

  return seconds === 0 ? `${value}, must-revalidate` : value;
}

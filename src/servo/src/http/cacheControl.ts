// CONSTANTS
/**
 * Caches treat any larger delta-seconds as this value (RFC 9111, section 1.2.2).
 */
const kMaxDeltaSeconds = 2_147_483_648;

export interface CacheControlOptions {
  /**
   * Forces `no-cache`, `maxAge` is ignored.
   */
  dev?: boolean;
  /**
   * Seconds, floored and clamped to `[0, 2147483648]`. `NaN` throws a `TypeError`.
   */
  maxAge?: number;
  immutable?: boolean;
  /**
   * Sends `private` instead of `public` with `maxAge`, so shared caches do not
   * store the response.
   * @default false
   */
  private?: boolean;
}

/**
 * Throws the `TypeError` that `cacheControl(options)` would, so options can be
 * checked once up front instead of on every request.
 * @internal
 */
export function assertCacheControlOptions(
  options: CacheControlOptions
): void {
  const { dev = false, maxAge } = options;

  if (
    !dev &&
    maxAge !== undefined &&
    (typeof maxAge !== "number" || Number.isNaN(maxAge))
  ) {
    throw new TypeError(`Invalid maxAge: ${String(maxAge)}`);
  }
}

export function cacheControl(
  options: CacheControlOptions
): string | null {
  assertCacheControlOptions(options);

  const {
    dev = false,
    maxAge,
    immutable = false,
    private: isPrivate = false
  } = options;

  if (dev) {
    return "no-cache";
  }
  if (maxAge === undefined) {
    return null;
  }

  const seconds = Math.min(
    kMaxDeltaSeconds,
    Math.max(0, Math.floor(maxAge))
  );
  const value = `${isPrivate ? "private" : "public"}, max-age=${seconds}`;
  if (immutable) {
    return `${value}, immutable`;
  }

  return seconds === 0 ? `${value}, must-revalidate` : value;
}

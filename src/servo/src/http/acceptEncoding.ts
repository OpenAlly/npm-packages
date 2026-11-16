/**
 * Whether an `Accept-Encoding` header accepts `coding` with a q-value above 0.
 * An explicit entry for `coding` takes precedence over `*`.
 *
 * @example acceptsEncoding("gzip, br;q=0.5", "br") // true
 * @example acceptsEncoding("*, br;q=0", "br") // false
 * @example acceptsEncoding("*;q=0, br", "br") // true
 */
export function acceptsEncoding(
  header: string | undefined,
  coding: string
): boolean {
  return acceptedEncodings(header, [coding]).length > 0;
}

/**
 * Picks the coding of `codings` the header prefers: highest q-value first,
 * then the order of `codings` on a tie. Returns `null` when none is accepted.
 *
 * @example negotiateEncoding("gzip, br", ["br", "gzip"]) // "br"
 * @example negotiateEncoding("gzip, br;q=0.5", ["br", "gzip"]) // "gzip"
 */
export function negotiateEncoding<T extends string>(
  header: string | undefined,
  codings: readonly T[]
): T | null {
  return acceptedEncodings(header, codings)[0] ?? null;
}

/**
 * Every coding of `codings` accepted by the header, sorted as
 * `negotiateEncoding` would pick them. Parses the header once.
 * @internal
 */
export function acceptedEncodings<T extends string>(
  header: string | undefined,
  codings: readonly T[]
): T[] {
  if (header === undefined || codings.length === 0) {
    return [];
  }

  const qualities = parseQualities(header);
  const wildcard = qualities.get("*");
  const accepted: { coding: T; quality: number; }[] = [];
  for (const coding of codings) {
    const quality = qualities.get(coding.toLowerCase()) ?? wildcard ?? 0;
    if (quality > 0) {
      accepted.push({ coding, quality });
    }
  }

  // Array.prototype.sort is stable, so ties keep the order of `codings`.
  return accepted
    .sort((left, right) => right.quality - left.quality)
    .map(({ coding }) => coding);
}

/**
 * Maps each lowercased token to its q-value. The first entry of a token wins.
 */
function parseQualities(
  header: string
): Map<string, number> {
  const qualities = new Map<string, number>();
  for (const entry of header.split(",")) {
    const [name, ...parameters] = entry.split(";");
    const token = name.trim().toLowerCase();
    if (token !== "" && !qualities.has(token)) {
      qualities.set(token, qValue(parameters));
    }
  }

  return qualities;
}

function qValue(
  parameters: string[]
): number {
  for (const parameter of parameters) {
    const [key, value = ""] = parameter.split("=");
    if (key.trim().toLowerCase() === "q") {
      const quality = Number(value.trim());

      return Number.isNaN(quality) ? 0 : quality;
    }
  }

  return 1;
}

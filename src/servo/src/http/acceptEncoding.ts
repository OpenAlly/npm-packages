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
  if (header === undefined) {
    return false;
  }

  let wildcard: number | null = null;
  for (const entry of header.split(",")) {
    const [name, ...parameters] = entry.split(";");
    const token = name.trim().toLowerCase();
    if (token !== coding && token !== "*") {
      continue;
    }

    const quality = qValue(parameters);
    if (token === coding) {
      return quality > 0;
    }
    wildcard = quality;
  }

  return wildcard !== null && wildcard > 0;
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

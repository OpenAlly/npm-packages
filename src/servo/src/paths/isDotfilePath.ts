// CONSTANTS
const kWellKnown = ".well-known";

/**
 * Exempts a leading `.well-known` segment (RFC 8615).
 */
export function isDotfilePath(
  path: string
): boolean {
  const segments = path.split("/");
  const start = segments[0] === kWellKnown ? 1 : 0;

  return segments
    .slice(start)
    .some((segment) => segment.startsWith("."));
}

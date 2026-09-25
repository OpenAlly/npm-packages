// CONSTANTS
const kUnit = /^\s*bytes\s*=/i;
// Applied to a trimmed string: adjacent `\s*` around an empty `(\d*)` would backtrack polynomially
const kSpec = /^(\d*)\s*-\s*(\d*)$/;

export interface ByteRange {
  start: number;
  end: number;
}

/**
 * `null` means ignore the header and send the full body (invalid syntax, unit
 * or multiple ranges). `"unsatisfiable"` means 416. Valid ranges are clamped
 * to `size - 1`.
 */
export function parseRange(
  header: string,
  size: number
): ByteRange | "unsatisfiable" | null {
  const unit = kUnit.exec(header);
  if (unit === null) {
    return null;
  }

  const spec = kSpec.exec(
    header.slice(unit[0].length).trim()
  );
  if (spec === null) {
    return null;
  }

  const [, first, last] = spec;
  if (first === "") {
    if (last === "") {
      return null;
    }

    const suffix = Number(last);
    if (suffix === 0 || size === 0) {
      return "unsatisfiable";
    }

    return {
      start: Math.max(0, size - suffix),
      end: size - 1
    };
  }

  const start = Number(first);
  const end = last === "" ? size - 1 : Number(last);
  if (start >= size || start > end) {
    return "unsatisfiable";
  }

  return {
    start,
    end: Math.min(end, size - 1)
  };
}

/**
 * Splits a raw request target at the first `?` or `#` and percent-decodes the
 * path once. Returns `null` when the encoding is malformed.
 *
 * The WHATWG `URL` parser is deliberately not used: it collapses `..` and
 * `%2e%2e` silently, which would hide traversal attempts from `safePath`.
 */
export function decodeRequestPath(
  target: string
): string | null {
  return decodePath(
    splitTarget(target).path
  );
}

export function decodePath(
  encoded: string
): string | null {
  try {
    return decodeURIComponent(encoded);
  }
  catch {
    return null;
  }
}

export function splitTarget(
  target: string
): { path: string; search: string; } {
  const separator = target.search(/[?#]/);
  if (separator === -1) {
    return { path: target, search: "" };
  }

  const path = target.slice(0, separator);
  if (target[separator] === "#") {
    return { path, search: "" };
  }

  const hash = target.indexOf("#", separator);

  return {
    path,
    search: hash === -1
      ? target.slice(separator)
      : target.slice(separator, hash)
  };
}

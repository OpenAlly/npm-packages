// Import Internal Dependencies
import { normalizePosix } from "./normalizePosix.ts";

// CONSTANTS
const kWindowsDrive = /^[a-zA-Z]:/;
const kWindowsDevice = /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\..*)?$/i;

export type PathRejection =
  | "invalid"
  | "absolute"
  | "traversal"
  | "reserved";

export type SafePath =
  | { ok: true; path: string; directory: boolean; }
  | { ok: false; reason: PathRejection; };

/**
 * Validates and normalizes a decoded, root-relative request path.
 *
 * On success, `path` has no leading or trailing slash (`""` is the root) and
 * `directory` tells whether the input named a directory (empty, or ending with
 * a slash). Windows-specific rules apply on every platform, so a path rejected
 * on Windows is also rejected on Linux.
 */
export function safePath(
  input: string
): SafePath {
  if (hasControlCharacter(input)) {
    return reject("invalid");
  }

  const posix = input.replaceAll("\\", "/");
  if (
    posix.startsWith("/") ||
    kWindowsDrive.test(posix)
  ) {
    return reject("absolute");
  }

  const normalized = normalizePosix(posix);
  if (
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    return reject("traversal");
  }

  if (
    normalized === "." ||
    normalized === "./"
  ) {
    return {
      ok: true,
      path: "",
      directory: true
    };
  }

  const directory = normalized.endsWith("/");
  const path = directory ? normalized.slice(0, -1) : normalized;
  if (path.split("/").some(isReservedSegment)) {
    return reject("reserved");
  }

  return {
    ok: true,
    path,
    directory
  };
}

function hasControlCharacter(
  input: string
): boolean {
  for (let index = 0; index < input.length; index++) {
    const code = input.charCodeAt(index);
    if (code <= 0x1F || code === 0x7F) {
      return true;
    }
  }

  return false;
}

function isReservedSegment(
  segment: string
): boolean {
  return segment.includes(":") ||
    segment.endsWith(".") ||
    segment.endsWith(" ") ||
    kWindowsDevice.test(segment);
}

function reject(
  reason: PathRejection
): SafePath {
  return {
    ok: false,
    reason
  };
}

// Import Node.js Dependencies
import type { IncomingMessage } from "node:http";

export interface Validators {
  etag?: string;
  mtime?: Date;
}

/**
 * `If-None-Match` takes precedence and uses weak comparison. Otherwise,
 * `If-Modified-Since` compares `mtime` at second precision.
 */
export function isFresh(
  req: IncomingMessage,
  validators: Validators
): boolean {
  const { etag, mtime } = validators;

  const ifNoneMatch = req.headers["if-none-match"];
  if (ifNoneMatch !== undefined) {
    if (etag === undefined) {
      return false;
    }

    const opaque = opaqueTag(etag);

    return ifNoneMatch
      .split(",")
      .some((tag) => {
        const trimmed = tag.trim();

        return trimmed === "*" || opaqueTag(trimmed) === opaque;
      });
  }

  const ifModifiedSince = req.headers["if-modified-since"];
  if (ifModifiedSince === undefined || mtime === undefined) {
    return false;
  }

  const since = Date.parse(ifModifiedSince);

  return !Number.isNaN(since) && truncateToSeconds(mtime) <= since;
}

/**
 * `If-Range` tags require a strong match; dates must equal `Last-Modified`.
 * A missing header permits the range.
 */
export function ifRangeMatches(
  req: IncomingMessage,
  validators: Validators
): boolean {
  const header = req.headers["if-range"];
  if (typeof header !== "string") {
    return true;
  }

  const ifRange = header.trim();

  const { etag, mtime } = validators;
  if (ifRange.startsWith("\"") || ifRange.startsWith("W/")) {
    return etag !== undefined &&
      !etag.startsWith("W/") &&
      ifRange === etag;
  }

  const date = Date.parse(ifRange);

  return mtime !== undefined &&
    !Number.isNaN(date) &&
    truncateToSeconds(mtime) === date;
}

function opaqueTag(
  tag: string
): string {
  return tag.startsWith("W/") ? tag.slice(2) : tag;
}

function truncateToSeconds(
  date: Date
): number {
  return Math.floor(date.getTime() / 1000) * 1000;
}

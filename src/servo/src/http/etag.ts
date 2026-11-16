// Import Node.js Dependencies
import { createHash } from "node:crypto";

// CONSTANTS
const kContentEtags = new WeakMap<Uint8Array, string>();

export function weakEtag(
  size: number,
  mtime: Date
): string {
  const sizeHex = size.toString(16);
  const mtimeHex = Math.trunc(
    mtime.getTime()
  ).toString(16);

  return `W/"${sizeHex}-${mtimeHex}"`;
}

export function strongEtag(
  bytes: string | Uint8Array
): string {
  const digest = createHash("sha1")
    .update(bytes)
    .digest("base64url");

  return `"${digest}"`;
}

/**
 * `strongEtag` cached by the identity of `bytes`, so serving the same array
 * twice hashes it once. The bytes must not be mutated afterwards.
 */
export function contentEtag(
  bytes: Uint8Array
): string {
  let tag = kContentEtags.get(bytes);
  if (tag === undefined) {
    tag = strongEtag(bytes);
    kContentEtags.set(bytes, tag);
  }

  return tag;
}

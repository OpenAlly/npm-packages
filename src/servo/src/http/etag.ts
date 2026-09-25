// Import Node.js Dependencies
import { createHash } from "node:crypto";

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

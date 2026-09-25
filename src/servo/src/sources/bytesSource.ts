// Import Internal Dependencies
import { strongEtag } from "../http/etag.ts";
import type { ServoEntry, ServoSource } from "./types.ts";

export interface BytesSourceOptions {
  /**
   * `"content"` adds a strong ETag hashed from the bytes, which suits stores
   * that have no modification time.
   * @default false
   */
  etag?: "content" | false;
}

/**
 * Adapts an in-memory or custom byte store to a `ServoSource`. `read` resolves
 * `null` when nothing exists at `path`. The source has no notion of directory.
 */
export function bytesSource(
  read: (path: string) => Promise<Uint8Array | null>,
  options: BytesSourceOptions = {}
): ServoSource {
  const { etag = false } = options;

  return {
    async lookup(path) {
      const bytes = await read(path);

      return bytes === null
        ? null
        : bytesEntry(bytes, etag === "content");
    }
  };
}

export function bytesEntry(
  bytes: Uint8Array,
  etag: boolean
): ServoEntry {
  return {
    size: bytes.byteLength,
    etag: etag ? strongEtag(bytes) : undefined,
    body(range) {
      return range === undefined
        ? bytes
        : bytes.subarray(range.start, range.end + 1);
    },
    [Symbol.asyncDispose]() {
      return Promise.resolve();
    }
  };
}

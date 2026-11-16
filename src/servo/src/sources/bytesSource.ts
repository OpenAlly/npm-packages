// Import Internal Dependencies
import { contentEtag } from "../http/etag.ts";
import type { ServoEntry, ServoSource } from "./types.ts";

export interface BytesSourceOptions {
  /**
   * `"content"` adds a strong ETag hashed from the bytes, which suits stores
   * that have no modification time. The hash is cached per `Uint8Array`, so
   * a store that returns the same array for every read hashes it once.
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
        : bytesEntry(bytes, {
          etag: etag === "content" ? contentEtag(bytes) : undefined
        });
    }
  };
}

export interface BytesEntryOptions {
  /**
   * Used as the ETag as is. `contentEtag(bytes)` hashes one from the bytes.
   */
  etag?: string;
  mtime?: Date;
}

/**
 * Wraps bytes already in memory as a `ServoEntry`. Ranges are views over the
 * same memory, and disposal is a no-op.
 */
export function bytesEntry(
  bytes: Uint8Array,
  options: BytesEntryOptions = {}
): ServoEntry {
  const { etag, mtime } = options;

  return {
    size: bytes.byteLength,
    mtime,
    etag,
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

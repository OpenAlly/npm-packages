// Import Node.js Dependencies
import { Buffer } from "node:buffer";
import { constants, type BigIntStats } from "node:fs";
import fs, { type FileHandle } from "node:fs/promises";
import path from "node:path";

// Import Internal Dependencies
import { errorCode, isMissingError } from "../fsErrors.ts";
import { ContainedRoot, isOutside } from "../paths/containedPath.ts";
import type { ByteRange } from "../http/range.ts";
import {
  kFollowSymlinks,
  realPathContainment,
  type Containment
} from "./containment.ts";
import type {
  EntryBody,
  Lookup,
  ServoEntry,
  ServoSource
} from "./types.ts";

// CONSTANTS
/**
 * O_NONBLOCK keeps `open` from hanging on a FIFO. It has no effect on regular files.
 */
const kOpenFlags = constants.O_RDONLY | (constants.O_NONBLOCK ?? 0);
/**
 * Bodies up to this size are read in one call instead of streamed, which
 * skips the stream and pipeline setup that dominates small responses.
 */
const kBufferedReadLimit = 64 * 1024;
/**
 * `open` errors that no request can get past: a link loop or a name too long
 * for the filesystem. They answer like a miss instead of a 500.
 */
const kUnreachableCodes = new Set(["ELOOP", "ENAMETOOLONG"]);

export interface FileSystemSourceOptions {
  /**
   * Serve files reached through symlinks that leave `root`.
   * @default false
   */
  followSymlinks?: boolean;
}

/**
 * Serves files from a folder of the local filesystem. Each lookup opens the
 * file and reads its metadata from the open handle, so size and mtime
 * describe the bytes that get streamed.
 *
 * The file is opened before its real path is checked against the root, so a
 * miss costs a single `open`. The check still runs before anything is served,
 * and the checked path must name the same entry (device and inode) as the
 * open handle.
 */
export class FileSystemSource implements ServoSource {
  readonly root: string;
  readonly followSymlinks: boolean;

  #containment: Containment;

  constructor(
    root: string,
    options: FileSystemSourceOptions = {}
  ) {
    const contained = new ContainedRoot(root);
    this.root = contained.root;
    this.followSymlinks = options.followSymlinks ?? false;
    this.#containment = this.followSymlinks
      ? kFollowSymlinks
      : realPathContainment(contained);
  }

  async lookup(
    relative: string
  ): Promise<Lookup> {
    const absolute = path.join(this.root, relative);
    // Holds even with `followSymlinks`, for callers that skip `safePath`.
    if (isOutside(this.root, absolute)) {
      return null;
    }

    let handle: FileHandle;
    try {
      handle = await fs.open(
        absolute,
        kOpenFlags
      );
    }
    catch (error) {
      const code = errorCode(error);
      if (
        isMissingError(error) ||
        (code !== undefined && kUnreachableCodes.has(code))
      ) {
        return null;
      }
      // An escaping link must answer like a miss, whatever its target does.
      if (!await this.#containment.allows(relative)) {
        return null;
      }
      if (code === "EISDIR") {
        return "directory";
      }

      throw error;
    }

    try {
      const stats = await this.#containment.verify(relative, handle);
      if (stats?.isFile()) {
        return fileEntry(
          handle,
          Number(stats.size),
          roundedMtime(stats)
        );
      }

      await handle.close();

      return stats?.isDirectory() ? "directory" : null;
    }
    catch (error) {
      await handle.close().catch(() => undefined);

      throw error;
    }
  }
}

/**
 * `BigIntStats#mtime` truncates to the millisecond where `Stats#mtime` rounds.
 * Rounding keeps weak ETags the same as with number stats. Microseconds since
 * the epoch fit a double exactly, nanoseconds do not.
 */
function roundedMtime(
  stats: BigIntStats
): Date {
  return new Date(
    Math.round(Number(stats.mtimeNs / 1000n) / 1000)
  );
}

function fileEntry(
  handle: FileHandle,
  size: number,
  mtime: Date
): ServoEntry {
  // Once body() is called, it owns the handle and closes it itself.
  let released = false;

  return {
    size,
    mtime,
    body(range?: ByteRange): EntryBody | Promise<EntryBody> {
      released = true;
      const start = range?.start ?? 0;
      const end = range?.end ?? Math.max(0, size - 1);

      if (end - start + 1 <= kBufferedReadLimit) {
        return readFully(handle, start, end - start + 1);
      }

      return handle.createReadStream({
        start,
        end,
        autoClose: true
      });
    },
    async [Symbol.asyncDispose]() {
      if (released) {
        return;
      }

      released = true;
      await handle.close();
    }
  };
}

/**
 * Reads `length` bytes from `position`, or fewer when the file shrank, then
 * closes the handle.
 */
async function readFully(
  handle: FileHandle,
  position: number,
  length: number
): Promise<Uint8Array> {
  try {
    const buffer = Buffer.allocUnsafe(length);
    let offset = 0;
    while (offset < length) {
      const { bytesRead } = await handle.read(
        buffer,
        offset,
        length - offset,
        position + offset
      );
      if (bytesRead === 0) {
        break;
      }
      offset += bytesRead;
    }

    return buffer.subarray(0, offset);
  }
  finally {
    await handle.close();
  }
}

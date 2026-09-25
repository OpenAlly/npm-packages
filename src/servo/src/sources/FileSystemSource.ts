// Import Node.js Dependencies
import { constants } from "node:fs";
import fs, { type FileHandle } from "node:fs/promises";
import path from "node:path";

// Import Internal Dependencies
import { errorCode, isMissingError } from "../fsErrors.ts";
import { containedIn, realPath } from "../paths/containedPath.ts";
import type { ByteRange } from "../http/range.ts";
import type {
  Lookup,
  ServoEntry,
  ServoSource
} from "./types.ts";

// CONSTANTS
/**
 * O_NONBLOCK keeps `open` from hanging on a FIFO. It has no effect on regular files.
 */
const kOpenFlags = constants.O_RDONLY | (constants.O_NONBLOCK ?? 0);

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
 */
export class FileSystemSource implements ServoSource {
  readonly root: string;
  readonly followSymlinks: boolean;

  #realRoot: Promise<string> | null = null;

  constructor(
    root: string,
    options: FileSystemSourceOptions = {}
  ) {
    this.root = path.resolve(root);
    this.followSymlinks = options.followSymlinks ?? false;
  }

  async lookup(
    relative: string
  ): Promise<Lookup> {
    const absolute = await this.#resolve(relative);
    if (absolute === null) {
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
      if (isMissingError(error)) {
        return null;
      }
      if (errorCode(error) === "EISDIR") {
        return "directory";
      }

      throw error;
    }

    try {
      const stats = await handle.stat();
      if (stats.isDirectory()) {
        await handle.close();

        return "directory";
      }
      if (!stats.isFile()) {
        await handle.close();

        return null;
      }

      return fileEntry(
        handle,
        stats.size,
        stats.mtime
      );
    }
    catch (error) {
      await handle.close().catch(() => undefined);

      throw error;
    }
  }

  async #resolve(
    relative: string
  ): Promise<string | null> {
    const absolute = path.join(
      this.root,
      relative
    );
    if (this.followSymlinks) {
      return absolute;
    }

    this.#realRoot ??= realPath(this.root).catch((error) => {
      this.#realRoot = null;
      throw error;
    });

    return containedIn(
      await this.#realRoot,
      absolute
    );
  }
}

function fileEntry(
  handle: FileHandle,
  size: number,
  mtime: Date
): ServoEntry {
  // Once body() is called, the stream owns the handle and closes it itself.
  let released = false;

  return {
    size,
    mtime,
    body(range?: ByteRange) {
      const stream = handle.createReadStream({
        start: range?.start ?? 0,
        end: range?.end ?? Math.max(0, size - 1),
        autoClose: true
      });
      released = true;

      return stream;
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

// Import Node.js Dependencies
import type { BigIntStats } from "node:fs";
import fs, { type FileHandle } from "node:fs/promises";

// Import Internal Dependencies
import { isMissingError } from "../fsErrors.ts";
import type { ContainedRoot } from "../paths/containedPath.ts";

/**
 * How `FileSystemSource` keeps lookups inside its root once the path has been
 * opened (or failed to open).
 * @internal
 */
export interface Containment {
  /**
   * Whether the error of a failed `open` on `relative` may be reported, as
   * opposed to answering like a miss.
   */
  allows(relative: string): Promise<boolean>;
  /**
   * Stats of `handle`, opened from `relative`, when it names an entry inside
   * the root. `null` otherwise.
   */
  verify(relative: string, handle: FileHandle): Promise<BigIntStats | null>;
}

/**
 * Links are followed wherever they point.
 * @internal
 */
export const kFollowSymlinks: Containment = {
  allows() {
    return Promise.resolve(true);
  },
  verify(_relative, handle) {
    return handle.stat({ bigint: true });
  }
};

/**
 * The real path, links resolved, must stay inside the real path of the root,
 * and must still name the entry the handle opened.
 * @internal
 */
export function realPathContainment(
  root: ContainedRoot
): Containment {
  return {
    async allows(relative) {
      return await root.resolve(relative) !== null;
    },
    async verify(relative, handle) {
      const [real, stats] = await Promise.all([
        root.resolve(relative),
        handle.stat({ bigint: true })
      ]);

      return real !== null && await isSameEntry(real, stats)
        ? stats
        : null;
    }
  };
}

/**
 * Whether `real`, the checked path, still names the entry the handle opened.
 * `open` follows links before the check runs, so a link swapped in between
 * would otherwise serve the bytes of a target the check never saw. `lstat`
 * keeps a link swapped back onto the last segment from matching.
 * @internal
 */
export async function isSameEntry(
  real: string,
  opened: BigIntStats
): Promise<boolean> {
  try {
    const current = await fs.lstat(real, { bigint: true });

    return current.dev === opened.dev && current.ino === opened.ino;
  }
  catch (error) {
    if (isMissingError(error)) {
      return false;
    }

    throw error;
  }
}

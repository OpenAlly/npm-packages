// Import Node.js Dependencies
import fs from "node:fs/promises";
import path from "node:path";

// Import Internal Dependencies
import { isMissingError } from "../fsErrors.ts";

/**
 * Returns the real path under `root`, or `null` on escape. Symlinks are checked;
 * missing leaves inherit the real path of their closest existing parent.
 */
export async function containedPath(
  root: string,
  relative: string
): Promise<string | null> {
  const absoluteRoot = path.resolve(root);

  return containedIn(
    await realPath(absoluteRoot),
    path.join(absoluteRoot, relative)
  );
}

/**
 * Accepts a resolved root to avoid repeated lookups.
 * @internal
 */
export async function containedIn(
  realRoot: string,
  absolute: string
): Promise<string | null> {
  const real = await realPath(absolute);
  if (real === realRoot) {
    return real;
  }

  const relative = path.relative(
    realRoot,
    real
  );
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    return null;
  }

  return real;
}

/**
 * Resolves existing parents of a missing leaf.
 * @internal
 */
export async function realPath(
  absolute: string
): Promise<string> {
  try {
    return await fs.realpath(absolute);
  }
  catch (error) {
    const parent = path.dirname(absolute);
    if (
      !isMissingError(error) ||
      parent === absolute
    ) {
      throw error;
    }

    return path.join(
      await realPath(parent),
      path.basename(absolute)
    );
  }
}

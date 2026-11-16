// Import Node.js Dependencies
import fs from "node:fs/promises";
import path from "node:path";

// Import Internal Dependencies
import { isMissingError } from "../fsErrors.ts";

/**
 * Returns the real path under `root`, or `null` on escape. Symlinks are checked;
 * missing leaves inherit the real path of their closest existing parent.
 */
export function containedPath(
  root: string,
  relative: string
): Promise<string | null> {
  return new ContainedRoot(root).resolve(relative);
}

/**
 * `containedPath` bound to one root, whose real path is resolved once and
 * reused. A failed resolution is retried on the next call, and a rejected path
 * resolves the root again, so a root link retargeted by a deploy is picked up.
 */
export class ContainedRoot {
  readonly root: string;

  #realRoot: Promise<string> | null = null;

  constructor(
    root: string
  ) {
    this.root = path.resolve(root);
  }

  /**
   * Same contract as `containedPath(root, relative)`.
   */
  async resolve(
    relative: string
  ): Promise<string | null> {
    const absolute = path.join(this.root, relative);
    const cached = await this.#resolveRoot();
    const contained = await containedIn(cached, absolute);
    if (contained !== null) {
      return contained;
    }

    // Escapes are rare, so checking whether the root moved costs little.
    this.#realRoot = null;
    const current = await this.#resolveRoot();

    return current === cached ? null : containedIn(current, absolute);
  }

  /**
   * The real path of `root`, cached until it fails or is reset.
   */
  #resolveRoot(): Promise<string> {
    if (this.#realRoot === null) {
      const pending = realPath(this.root).catch((error) => {
        if (this.#realRoot === pending) {
          this.#realRoot = null;
        }
        throw error;
      });
      this.#realRoot = pending;
    }

    return this.#realRoot;
  }
}

/**
 * Whether `target` lies outside `root`, compared lexically. `root` itself is
 * inside.
 * @internal
 */
export function isOutside(
  root: string,
  target: string
): boolean {
  const relative = path.relative(root, target);

  return relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative);
}

async function containedIn(
  realRoot: string,
  absolute: string
): Promise<string | null> {
  const real = await realPath(absolute);

  return isOutside(realRoot, real) ? null : real;
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

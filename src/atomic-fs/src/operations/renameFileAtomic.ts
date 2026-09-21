// Import Node.js Dependencies
import path from "node:path";

// Import Internal Dependencies
import {
  exclusiveCommit,
  replaceCommit
} from "./common/commit.ts";
import {
  defaultFs,
  errorCode
} from "../internal/fs.ts";
import {
  ensureDirectory,
  syncFile
} from "../internal/paths.ts";
import { lockPaths } from "../internal/queue.ts";
import { resolveRetry } from "../internal/retry.ts";
import { withTemporary } from "../internal/temporary.ts";
import { resolveTemporaryNaming } from "../naming.ts";
import type { RenameFileAtomicOptions } from "../types.ts";

export async function renameFileAtomic(
  from: string,
  to: string,
  options: RenameFileAtomicOptions = {}
): Promise<boolean> {
  const {
    overwrite = true,
    mkdir = false,
    fsync = true,
    cleanupOnExit = true,
    signal,
    fs = defaultFs
  } = options;

  const naming = resolveTemporaryNaming(options.naming);
  const retry = resolveRetry(options.retry);
  const commit = overwrite ? replaceCommit : exclusiveCommit;

  signal?.throwIfAborted();
  using lock = await lockPaths(fs, [
    path.resolve(from),
    path.resolve(to)
  ]);
  const [source, destination] = lock.truenames;

  signal?.throwIfAborted();
  await ensureDirectory(
    fs,
    destination,
    mkdir
  );

  signal?.throwIfAborted();
  try {
    return await commit(
      { fs, retry },
      source,
      destination
    );
  }
  catch (error) {
    if (errorCode(error) !== "EXDEV") {
      throw error;
    }
  }

  const moved = await withTemporary(
    { fs, cleanupOnExit },
    naming.create(destination),
    async(tmpfile) => {
      await fs.copyFile(source, tmpfile);
      if (fsync) {
        await syncFile(fs, tmpfile);
      }

      return commit({ fs, retry }, tmpfile, destination);
    }
  );
  if (moved) {
    await fs.unlink(source);
  }

  return moved;
}

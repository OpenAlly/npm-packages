// Import Node.js Dependencies
import path from "node:path";

// Import Internal Dependencies
import type { Commit } from "./commit.ts";
import { defaultFs } from "../../internal/fs.ts";
import {
  applyOwnership,
  resolveOwnership
} from "../../internal/ownership.ts";
import {
  ensureDirectory,
  syncDirectory
} from "../../internal/paths.ts";
import { lockPaths } from "../../internal/queue.ts";
import { resolveRetry } from "../../internal/retry.ts";
import { withTemporary } from "../../internal/temporary.ts";
import { resolveTemporaryNaming } from "../../naming.ts";
import type {
  AtomicData,
  WriteFileAtomicOptions
} from "../../types.ts";

export type StageOptions = WriteFileAtomicOptions & {
  commit: Commit;
};

export async function stageAndCommit(
  target: string,
  data: AtomicData,
  options: StageOptions
): Promise<boolean> {
  const {
    encoding = "utf8",
    fsync = true,
    fsyncDirectory = false,
    mkdir = false,
    cleanupOnExit = true,
    commit,
    tmpfileCreated,
    signal,
    fs = defaultFs
  } = options;

  const naming = resolveTemporaryNaming(options.naming);
  const retry = resolveRetry(options.retry);

  signal?.throwIfAborted();
  using lock = await lockPaths(
    fs,
    [path.resolve(target)]
  );
  const [truename] = lock.truenames;

  signal?.throwIfAborted();
  await ensureDirectory(fs, truename, mkdir);
  const ownership = await resolveOwnership(fs, truename, options);

  return withTemporary({ fs, cleanupOnExit }, naming.create(truename), async(tmpfile) => {
    signal?.throwIfAborted();
    const handle = await fs.open(
      tmpfile,
      "wx",
      ownership.mode ?? 0o666
    );
    try {
      await tmpfileCreated?.(tmpfile);

      signal?.throwIfAborted();
      await handle.writeFile(
        typeof data === "string" ? data : toBytes(data),
        { encoding, signal }
      );

      if (fsync) {
        await handle.sync();
      }
    }
    finally {
      await handle.close();
    }

    await applyOwnership(
      fs,
      tmpfile,
      ownership
    );

    signal?.throwIfAborted();
    const committed = await commit(
      { fs, retry },
      tmpfile,
      truename
    );
    if (committed && fsyncDirectory) {
      await syncDirectory(fs, truename);
    }

    return committed;
  });
}

function toBytes(
  data: ArrayBufferView
): Uint8Array {
  return new Uint8Array(
    data.buffer,
    data.byteOffset,
    data.byteLength
  );
}

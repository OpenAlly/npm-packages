// Import Internal Dependencies
import { errorCode, type AtomicFs } from "./fs.ts";
import type { OwnershipOptions } from "../types.ts";

export type ResolvedOwnership = {
  mode: number | undefined;
  chown: OwnershipOptions | null;
};

export async function resolveOwnership(
  fs: Pick<AtomicFs, "stat">,
  target: string,
  options: { mode?: number; chown?: OwnershipOptions | false; }
): Promise<ResolvedOwnership> {
  const { mode, chown } = options;
  if (mode !== undefined && chown !== undefined) {
    return {
      mode,
      chown: chown === false ? null : chown
    };
  }

  const stats = await fs.stat(target).catch(() => null);

  return {
    mode: mode ?? stats?.mode,
    chown: resolveChown(chown, stats)
  };
}

export async function applyOwnership(
  fs: Pick<AtomicFs, "chown" | "chmod">,
  file: string,
  ownership: ResolvedOwnership
): Promise<void> {
  const { mode, chown } = ownership;

  if (chown !== null) {
    await fs.chown(file, chown.uid, chown.gid).catch(rethrowUnlessOk);
  }
  if (mode !== undefined) {
    await fs.chmod(file, mode).catch(rethrowUnlessOk);
  }
}

export function isOwnershipErrOk(
  error: unknown
): boolean {
  const code = errorCode(error);
  if (code === "ENOSYS") {
    return true;
  }

  const nonroot = process.getuid?.() !== 0;

  return nonroot && (code === "EINVAL" || code === "EPERM");
}

function rethrowUnlessOk(
  error: unknown
): void {
  if (!isOwnershipErrOk(error)) {
    throw error;
  }
}

function resolveChown(
  chown: OwnershipOptions | false | undefined,
  stats: { uid: number; gid: number; } | null
): OwnershipOptions | null {
  if (chown === false) {
    return null;
  }
  if (chown !== undefined) {
    return chown;
  }
  if (stats === null || process.getuid === undefined) {
    return null;
  }

  return { uid: stats.uid, gid: stats.gid };
}

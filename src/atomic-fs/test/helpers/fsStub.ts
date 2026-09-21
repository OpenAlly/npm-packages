// Import Internal Dependencies
import { defaultFs, type AtomicFs } from "../../src/internal/fs.ts";

export type FsStub = AtomicFs & {
  calls: string[];
};

/**
 * Wraps the real filesystem, records the name of every method the operations
 * reach for and lets a test swap any of them out.
 */
export function fsStub(
  overrides: Partial<AtomicFs> = {}
): FsStub {
  const calls: string[] = [];
  const fs: AtomicFs = { ...defaultFs, ...overrides };

  return {
    calls,
    open(path, flags, mode) {
      calls.push("open");

      return fs.open(path, flags, mode);
    },
    stat(path) {
      calls.push("stat");

      return fs.stat(path);
    },
    realpath(path) {
      calls.push("realpath");

      return fs.realpath(path);
    },
    mkdir(path, options) {
      calls.push("mkdir");

      return fs.mkdir(path, options);
    },
    rename(from, to) {
      calls.push("rename");

      return fs.rename(from, to);
    },
    link(from, to) {
      calls.push("link");

      return fs.link(from, to);
    },
    unlink(path) {
      calls.push("unlink");

      return fs.unlink(path);
    },
    rm(path, options) {
      calls.push("rm");

      return fs.rm(path, options);
    },
    chown(path, uid, gid) {
      calls.push("chown");

      return fs.chown(path, uid, gid);
    },
    chmod(path, mode) {
      calls.push("chmod");

      return fs.chmod(path, mode);
    },
    copyFile(from, to) {
      calls.push("copyFile");

      return fs.copyFile(from, to);
    }
  };
}

export function errnoError(
  code: string
): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(`stubbed ${code}`);
  error.code = code;

  return error;
}

export function failTimes<Args extends unknown[], T>(
  code: string,
  times: number,
  then?: (...args: Args) => Promise<T>
): (...args: Args) => Promise<T> {
  let remaining = times;

  return (...args) => {
    if (remaining-- > 0) {
      return Promise.reject(errnoError(code));
    }
    if (then === undefined) {
      throw new Error("stub has no fallback implementation");
    }

    return then(...args);
  };
}

export function always(
  code: string
): () => Promise<never> {
  return () => Promise.reject(errnoError(code));
}

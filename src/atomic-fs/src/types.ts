// Import Internal Dependencies
import type { AtomicFs } from "./internal/fs.ts";
import type { TemporaryNamingInput } from "./naming.ts";

export type AtomicData = string | ArrayBufferView;

export interface RetryOptions {
  /**
   * Total number of tries, including the first one.
   * @default 5
   */
  attempts?: number;
  /**
   * Milliseconds to wait before the second try.
   * @default 10
   */
  delay?: number;
  /**
   * Multiplier applied to `delay` after each failed try.
   * @default 2
   */
  factor?: number;
}

export interface OwnershipOptions {
  uid: number;
  gid: number;
}

interface SharedOptions {
  /**
   * Creates the destination parent directory when missing.
   * @default false
   */
  mkdir?: boolean;
  /**
   * Temporary name generator and matcher, either a ready-made strategy or the
   * options `temporaryNaming` builds one from. Always replaces, never merges.
   * @default defaultTemporaryNaming
   */
  naming?: TemporaryNamingInput;
  /**
   * Retries `EPERM`, `EBUSY` and `EACCES` failures, which Windows raises when
   * an antivirus or another handle briefly holds the destination.
   * Defaults to enabled on `win32` only, `false` disables it.
   */
  retry?: RetryOptions | false;
  /**
   * Aborts between filesystem steps and during the write itself, leaving no
   * temporary file behind.
   */
  signal?: AbortSignal;
  /**
   * Unlinks the temporary file if the process exits mid-operation.
   * @default true
   */
  cleanupOnExit?: boolean;
  /** @internal */
  fs?: AtomicFs;
}

export interface WriteFileAtomicOptions extends SharedOptions {
  /**
   * Encoding used when `data` is a string.
   * @default "utf8"
   */
  encoding?: BufferEncoding;
  /**
   * Permissions of the temporary file, inherited from the destination when it
   * exists and falling back to `0o666`.
   */
  mode?: number;
  /**
   * Ownership applied to the temporary file, inherited from the destination
   * when it exists. `false` never changes ownership.
   */
  chown?: OwnershipOptions | false;
  /**
   * Flushes the temporary file to the storage device before renaming it.
   * @default true
   */
  fsync?: boolean;
  /**
   * Flushes the parent directory after renaming, so the new entry itself
   * survives a power loss. Ignored on `win32`.
   * @default false
   */
  fsyncDirectory?: boolean;
  /**
   * Awaited once the temporary file exists and before anything is written.
   */
  tmpfileCreated?: (tmpfile: string) => void | Promise<void>;
}

export interface RenameFileAtomicOptions extends SharedOptions {
  /**
   * Replaces the destination when it exists. When `false`, an existing
   * destination makes `renameFileAtomic` resolve `false` and leave both paths
   * untouched.
   * @default true
   */
  overwrite?: boolean;
  /**
   * Flushes the copy to the storage device when the rename has to cross a
   * device boundary.
   * @default true
   */
  fsync?: boolean;
}

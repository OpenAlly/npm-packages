// Import Node.js Dependencies
import nodeFs, { type FileHandle } from "node:fs/promises";

export type AtomicFileHandle = Pick<
  FileHandle,
  "writeFile" | "sync" | "close"
>;

export type AtomicStats = {
  mode: number;
  uid: number;
  gid: number;
};

export type AtomicFs = {
  open(path: string, flags: string, mode?: number): Promise<AtomicFileHandle>;
  stat(path: string): Promise<AtomicStats>;
  realpath(path: string): Promise<string>;
  mkdir(path: string, options: { recursive: true; }): Promise<string | undefined>;
  rename(from: string, to: string): Promise<void>;
  link(from: string, to: string): Promise<void>;
  unlink(path: string): Promise<void>;
  rm(path: string, options: { force: true; }): Promise<void>;
  chown(path: string, uid: number, gid: number): Promise<void>;
  chmod(path: string, mode: number): Promise<void>;
  copyFile(from: string, to: string): Promise<void>;
};

export const defaultFs: AtomicFs = nodeFs;

/**
 * Reads the `code` of a Node.js `ErrnoException` without trusting the thrown
 * value to be one, since `catch` and rejected promises both hand over
 * `unknown`.
 */
export function errorCode(
  error: unknown
): string | undefined {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return undefined;
  }

  const { code } = error;

  return typeof code === "string" ? code : undefined;
}

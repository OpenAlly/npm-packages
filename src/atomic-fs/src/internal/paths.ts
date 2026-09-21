// Import Node.js Dependencies
import path from "node:path";

// Import Internal Dependencies
import { errorCode, type AtomicFs } from "./fs.ts";

export async function truePath(
  fs: Pick<AtomicFs, "realpath">,
  absolute: string
): Promise<string> {
  try {
    return await fs.realpath(absolute);
  }
  catch (error) {
    if (errorCode(error) === "ENOENT") {
      return absolute;
    }

    throw error;
  }
}

export async function ensureDirectory(
  fs: AtomicFs,
  target: string,
  mkdir: boolean
): Promise<void> {
  if (mkdir) {
    await fs.mkdir(
      path.dirname(target),
      { recursive: true }
    );
  }
}

export function syncFile(
  fs: AtomicFs,
  file: string
): Promise<void> {
  return syncPath(fs, file, "r+");
}

export async function syncDirectory(
  fs: AtomicFs,
  target: string
): Promise<void> {
  if (process.platform !== "win32") {
    await syncPath(fs, path.dirname(target), "r");
  }
}

async function syncPath(
  fs: AtomicFs,
  target: string,
  flags: string
): Promise<void> {
  const handle = await fs.open(target, flags);
  try {
    await handle.sync();
  }
  finally {
    await handle.close();
  }
}

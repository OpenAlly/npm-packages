// Import Node.js Dependencies
import { unlinkSync } from "node:fs";

// Import Internal Dependencies
import type { AtomicFs } from "./fs.ts";

const kTracked = new Set<string>();

let installed = false;

export function track(
  tmpfile: string
): void {
  kTracked.add(tmpfile);
  install();
}

export function untrack(
  tmpfile: string
): void {
  kTracked.delete(tmpfile);
}

export function tracked(): readonly string[] {
  return [...kTracked];
}

function install(): void {
  if (installed) {
    return;
  }
  installed = true;

  process.on("exit", () => {
    for (const tmpfile of kTracked) {
      try {
        unlinkSync(tmpfile);
      }
      catch {
        continue;
      }
    }
    kTracked.clear();
  });
}

export type TemporaryContext = {
  fs: Pick<AtomicFs, "rm">;
  cleanupOnExit: boolean;
};

export async function withTemporary<T>(
  context: TemporaryContext,
  tmpfile: string,
  run: (tmpfile: string) => Promise<T>
): Promise<T> {
  if (context.cleanupOnExit) {
    track(tmpfile);
  }

  try {
    return await run(tmpfile);
  }
  finally {
    untrack(tmpfile);
    await context.fs.rm(
      tmpfile,
      { force: true }
    ).catch(() => void 0);
  }
}

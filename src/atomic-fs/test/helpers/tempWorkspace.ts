// Import Node.js Dependencies
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface TempWorkspace extends AsyncDisposable {
  root: string;
  resolve(...segments: string[]): string;
  entries(...segments: string[]): Promise<string[]>;
  read(...segments: string[]): Promise<string>;
  write(relative: string, content: string): Promise<string>;
}

export async function tempWorkspace(): Promise<TempWorkspace> {
  const root = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "atomic-fs-"))
  );

  function resolve(
    ...segments: string[]
  ): string {
    return path.join(root, ...segments);
  }

  return {
    root,
    resolve,
    async entries(...segments) {
      const names = await fs.readdir(resolve(...segments));

      return names.sort();
    },
    read(...segments) {
      return fs.readFile(resolve(...segments), "utf8");
    },
    async write(relative, content) {
      const absolute = resolve(relative);
      await fs.mkdir(path.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, content);

      return absolute;
    },
    async [Symbol.asyncDispose]() {
      await fs.rm(root, { recursive: true, force: true });
    }
  };
}

export async function exists(
  target: string
): Promise<boolean> {
  try {
    await fs.access(target);

    return true;
  }
  catch {
    return false;
  }
}

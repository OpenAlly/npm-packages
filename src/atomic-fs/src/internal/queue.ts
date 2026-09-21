// Import Internal Dependencies
import type { AtomicFs } from "./fs.ts";
import { truePath } from "./paths.ts";

const kTruePrefix = "true:";
const kTails = new Map<string, Promise<void>>();

export async function acquire(
  key: string
): Promise<Disposable> {
  const previous = kTails.get(key) ?? Promise.resolve();
  const { promise: tail, resolve: release } = Promise.withResolvers<void>();
  kTails.set(key, tail);

  await previous;

  return {
    [Symbol.dispose]() {
      if (kTails.get(key) === tail) {
        kTails.delete(key);
      }
      release();
    }
  };
}

export async function acquireAll(
  keys: readonly string[]
): Promise<Disposable> {
  using stack = new DisposableStack();
  const ordered = [
    ...new Set(keys)
  ].sort();

  for (const key of ordered) {
    stack.use(await acquire(key));
  }

  return stack.move();
}

export type PathLock = Disposable & {
  truenames: string[];
};

export async function lockPaths(
  fs: Pick<AtomicFs, "realpath">,
  paths: readonly string[]
): Promise<PathLock> {
  using stack = new DisposableStack();

  stack.use(await acquireAll(paths));
  const truenames = await Promise.all(
    paths.map((absolute) => truePath(fs, absolute))
  );
  stack.use(await acquireAll(
    truenames.map((truename) => `${kTruePrefix}${truename}`)
  ));

  const held = stack.move();

  return {
    truenames,
    [Symbol.dispose]: () => held.dispose()
  };
}

export function pending(): number {
  return kTails.size;
}

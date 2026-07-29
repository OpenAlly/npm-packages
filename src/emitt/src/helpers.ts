// Import Internal Dependencies
import type { EventMap } from "./types.ts";
import type { Emitter } from "./Emitter.class.ts";

export interface AbortOptions {
  signal?: AbortSignal;
}

function abortError(signal: AbortSignal): unknown {
  return signal.reason ?? new Error("The operation was aborted");
}

export function once<
  Events extends EventMap,
  E extends keyof Events
>(
  emitter: Emitter<Events>,
  event: E,
  options?: AbortOptions
): Promise<Parameters<Events[E]>> {
  const { signal } = options ?? {};

  if (signal?.aborted) {
    return Promise.reject(abortError(signal));
  }

  return new Promise((resolve, reject) => {
    function onEvent(...args: Parameters<Events[E]>) {
      cleanup();
      resolve(args);
    }
    function onAbort() {
      cleanup();
      reject(abortError(signal!));
    }
    function cleanup() {
      emitter.off(event, onEvent as Events[E]);
      signal?.removeEventListener("abort", onAbort);
    }

    emitter.on(event, onEvent as Events[E]);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function* on<
  Events extends EventMap,
  E extends keyof Events
>(
  emitter: Emitter<Events>,
  event: E,
  options?: AbortOptions
): AsyncGenerator<Parameters<Events[E]>, void, void> {
  const { signal } = options ?? {};

  if (signal?.aborted) {
    throw abortError(signal);
  }

  const queue: Parameters<Events[E]>[] = [];
  let pendingResolve: (() => void) | null = null;
  let pendingReject: unknown = null;

  function flush() {
    const resolve = pendingResolve;
    pendingResolve = null;
    resolve?.();
  }

  function onEvent(...args: Parameters<Events[E]>) {
    queue.push(args);
    flush();
  }

  function onAbort() {
    pendingReject = abortError(signal!);
    flush();
  }

  emitter.on(event, onEvent as Events[E]);
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    while (true) {
      while (queue.length > 0) {
        yield queue.shift()!;
      }
      if (pendingReject) {
        throw pendingReject;
      }
      await new Promise<void>((resolve) => {
        pendingResolve = resolve;
      });
    }
  }
  finally {
    emitter.off(event, onEvent as Events[E]);
    signal?.removeEventListener("abort", onAbort);
  }
}

export function addAbortListener(
  signal: AbortSignal,
  listener: (event: Event) => void
): Disposable {
  if (signal.aborted) {
    queueMicrotask(() => listener(new Event("abort")));

    return {
      [Symbol.dispose]() {
        return;
      }
    };
  }

  signal.addEventListener("abort", listener, { once: true });

  return {
    [Symbol.dispose]() {
      signal.removeEventListener("abort", listener);
    }
  };
}

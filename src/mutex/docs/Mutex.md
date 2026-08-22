# Mutex

Limits how many asynchronous operations may run at once. When all slots are occupied, later `acquire()` calls wait for a release.

## Usage

```ts
import timers from "node:timers/promises";

import { Mutex } from "@openally/mutex";

const mutex = new Mutex({ concurrency: 2 });

async function save(record: Record<string, unknown>) {
  using release = await mutex.acquire({
    signal: AbortSignal.timeout(5_000),
    delayBeforeAutomaticRelease: 30_000
  });

  await timers.setTimeout(100);
  await writeRecord(record);
}

await Promise.all(records.map(save));
```

The `using` declaration calls the release callback when the scope ends. The 30-second automatic release is a fallback if the operation never completes.

## Constructor

```ts
new Mutex(options?: MutexOptions)

export interface MutexOptions {
  /** @default 5 */
  concurrency?: number;

  /** @default true */
  keepReferencingTimers?: boolean;
}
```

| Option | Description |
| --- | --- |
| `concurrency` | Maximum simultaneous acquisitions. Values are clamped between `1` and `Mutex.MaximumConcurrency`. |
| `keepReferencingTimers` | When `false`, automatic-release timers do not keep the Node.js process alive. |

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `concurrency` | `number` | Configured acquisition limit after clamping. |
| `running` | `number` | Number of occupied slots. |
| `locked` | `boolean` | Whether all slots are occupied. |
| `Mutex.MaximumConcurrency` | `number` | Static upper limit for `concurrency`: `1000`. |

## Methods

### `acquire(options?: MutexAcquireOptions): Promise<MutexFree>`

Waits for a slot and returns its release callback.

```ts
export interface MutexAcquireOptions {
  /** Abort while waiting for a slot. */
  signal?: AbortSignal;

  /** Milliseconds from acquisition to automatic release. */
  delayBeforeAutomaticRelease?: number;
}
```

`signal` only affects the wait. An already-aborted signal rejects immediately, while an abort after acquisition has no effect.

`delayBeforeAutomaticRelease` starts after acquisition. Omit it to disable automatic release.

The promise rejects with [`MutexCanceledError`](#mutexcancelederror) when the mutex is cancelled or the signal aborts before acquisition.

The returned callback releases at most once and implements `Disposable`:

```ts
export type MutexFree = (() => void) & Disposable;
```

```ts
{
  using release = await mutex.acquire();
  await doWork();
}
```

### `release(): this`

Releases one occupied slot and returns the mutex. It has no effect when `running` is `0`.

> [!IMPORTANT]
> Prefer the callback returned by `acquire()`: it is tied to one acquisition and is idempotent. Extra direct `release()` calls can release slots held by other operations.

### `cancel(): this`

Rejects queued and future acquisitions with `MutexCanceledError` and sets `running` to `0`, but work that already acquired a slot keeps running because `cancel()` does not abort it.

### `reset(): this`

Rejects queued acquisitions, sets `running` to `0`, and allows new acquisitions. Work that already acquired a slot keeps running.

> [!WARNING]
> Wait for work from earlier acquisitions to finish before reusing a reset mutex.

## Events

`Mutex` extends [Node.js `EventEmitter`](https://nodejs.org/api/events.html). The package exports the event name as a symbol.

| Event | Description |
| --- | --- |
| `MutexRelease` | Emitted after a manual, callback, or automatic release. |

```ts
import { once } from "node:events";
import { Mutex, MutexRelease } from "@openally/mutex";

const mutex = new Mutex();

const release = await mutex.acquire();
setImmediate(release);

await once(mutex, MutexRelease);
```

## `MutexCanceledError`

Use `abortType` to distinguish API cancellation from an aborted signal.

```ts
import { Mutex, MutexCanceledError } from "@openally/mutex";

const mutex = new Mutex().cancel();

try {
  await mutex.acquire();
}
catch (error) {
  if (error instanceof MutexCanceledError) {
    console.error(error.abortType);
  }
}
```

```ts
export type MutexAbortType = "API" | "AbortSignal";

declare class MutexCanceledError extends Error {
  readonly abortType: MutexAbortType;
}
```

| `abortType` | Cause |
| --- | --- |
| `"API"` | `cancel()` or `reset()` rejected the acquisition. |
| `"AbortSignal"` | The `signal` passed to `acquire()` aborted. |

<p align="center"><h1 align="center">
  Mutex
</h1>

<p align="center">
  Another Mutex/Semaphore implementation with first-class support of AbortSignal
</p>

## Requirements
- [Node.js](https://nodejs.org/en/) v16 or higher

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i @openally/mutex
# or
$ yarn add @openally/mutex
```

## Usage example

```ts
import timers from "node:timers/promises";

import { Mutex } from "@openally/mutex";

const lock = new Mutex({ concurrency: 2 });

async function asynchronousTask() {
  const free = await lock.acquire({
    signal: AbortSignal.timeout(5_000),

    // Release if your asynchronous task never give the hand back (leak/bug for example)
    delayBeforeAutomaticRelease: 30_000
  });

  try {
    // Do Asynchronous job here
    await timers.setTimeout(100);
    console.log("one job done!");
  }
  finally {
    free();
  }
}

await Promise.allSettled([
  asynchronousTask(),
  asynchronousTask(),
  asynchronousTask(),
  asynchronousTask(),
  asynchronousTask()
]);
console.log("all done!");
```

## API

```ts
declare class Mutex {
  static readonly MaximumConcurrency: number;

  public readonly concurrency: number;
  public readonly running: number;
  public readonly locked: boolean;
}
```

> **Note** The maximum concurrency defined on the class is `1000`

<details>
<summary>constructor(options: IMutexOptions)</summary>

The `options` payload is described by the following TypeScript interface:
```ts
export interface IMutexOptions {
  /**
   * @default 5
   */
  concurrency?: number;

  /**
   * If disabled it will unref() Node.js timers (allowing to not keep event loop alive).
   *
   * @default true
   */
  keepReferencingTimers?: boolean;
}
```
</details>

<details>
<summary>acquire(options: IMutexAcquireOptions): Promise< () => void > </summary>
Acquire one lock. The `options` payload is described by the following TypeScript interface:

```ts
export interface IMutexAcquireOptions {
  /**
   * AbortSignal to be able to define a maximum time to wait before abortion of lock acquisition.
   */
  signal?: AbortSignal;

  /**
   * When acquired, define a maximum delay before automatic release.
   *
   * No automatic release by default
   */
  delayBeforeAutomaticRelease?: number;
}
```

The acquire method return a callback function that will allow the developer to manually release.

</details>

<details>
<summary>release(): this</summary>

Manually release one lock. If there is no lock it will just return.

A event is emitted when release is triggered (the event itself is a Symbol exported by the package).
```ts
import { once } from "node:events";
import { Mutex, MutexRelease } from "@openally/mutex";

const lock = new Mutex();

const free = await lock.acquire();
// free will automatically trigger .release()
setImmediate(() => free());

await once(lock, MutexRelease);
console.log("done!");
```

</details>

<details>
<summary>cancel(): this</summary>

Cancel all running locks (will provoke dispatch MutexCanceledError to all promises).
</details>

<details>
<summary>reset(): this</summary>

Reset instance state (and remove cancellation if enabled). It will trigger `cancel()` if there is still promises running.
</details>

### Error management
When cancelled the `acquire` method will throw a MutexCanceledError error.

```ts
import { Mutex, MutexCanceledError } from "@openally/mutex";

const lock = new Mutex().cancel();

try {
  await lock.acquire();
}
catch (err) {
  console.log(err instanceof MutexCanceledError);
}
```

## License
MIT

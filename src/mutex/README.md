<p align="center"><h1 align="center">
  Mutex
</h1>

<p align="center">
  Another Mutex/Semaphore implementation with first-class support of AbortSignal
</p>

<p align="center">
  <a href="https://github.com/OpenAlly/npm-packages/src/mutex">
    <img src="https://img.shields.io/github/package-json/v/OpenAlly/npm-packages/main/src/mutex?style=for-the-badge&label=version" alt="npm version">
  </a>
  <a href="https://github.com/OpenAlly/npm-packages/tree/main/src/LICENSE">
    <img src="https://img.shields.io/github/license/OpenAlly/npm-packages?style=for-the-badge" alt="license">
  </a>
  <a href="https://github.com/OpenAlly/npm-packages/tree/main/src/mutex">
    <img src="https://img.shields.io/npm/dw/@openally/mutex?style=for-the-badge" alt="download">
  </a>
  <a href="https://github.com/OpenAlly/npm-packages/tree/main/src/mutex">
    <img src="https://img.shields.io/github/actions/workflow/status/OpenAlly/npm-packages/mutex.yml?style=for-the-badge">
  </a>
</p>

## Requirements
- [Node.js](https://nodejs.org/en/) v24 or higher

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i @openally/mutex
# or
$ yarn add @openally/mutex
```

## Usage example

Use `Mutex` to limit concurrent work:

```ts
import { Mutex } from "@openally/mutex";

const mutex = new Mutex({ concurrency: 2 });

async function save(record: Record<string, unknown>) {
  using release = await mutex.acquire({
    signal: AbortSignal.timeout(5_000),
    delayBeforeAutomaticRelease: 30_000
  });

  await writeRecord(record);
}

await Promise.all(records.map(save));
```

Use `TaskGroup` when tasks are scheduled without awaiting each one immediately:

```ts
import { Mutex, TaskGroup } from "@openally/mutex";

const tasks = new TaskGroup({
  mutex: new Mutex({ concurrency: 10 })
});

for (const user of users) {
  tasks.add(`email:${user.id}`, () => sendEmail(user));
}

const failures = await tasks.drain();
for (const { name, error } of failures) {
  console.error(`${name} failed`, error);
}
```

## API

- [`Mutex`](./docs/Mutex.md) limits concurrent asynchronous work and supports `AbortSignal` cancellation while waiting.
- [`TaskGroup`](./docs/TaskGroup.md) schedules tasks under a concurrency limit and collects their failures.
- [`MutexCanceledError`](./docs/Mutex.md#mutexcancelederror) identifies cancellation by `cancel()`, `reset()`, or `AbortSignal`.

## License
MIT

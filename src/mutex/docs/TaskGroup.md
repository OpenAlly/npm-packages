# TaskGroup

Schedules asynchronous tasks under a [`Mutex`](./Mutex.md), captures their failures, and waits for the group to settle.

## Usage

```ts
import { Mutex, TaskGroup } from "@openally/mutex";

await using tasks = new TaskGroup({
  mutex: new Mutex({ concurrency: 4 })
});

tasks.add("fetch-user", () => fetch(userUrl));
tasks.add("fetch-orders", () => fetch(ordersUrl));
```

`await using` waits for the tasks when the scope exits and discards their failures. Call `drain()` when you need the errors:

```ts
const tasks = new TaskGroup();

tasks.add("fetch-user", () => fetch(userUrl));

const failures = await tasks.drain();
for (const { name, error } of failures) {
  console.error(`${name} failed`, error);
}
```

## Constructor

```ts
new TaskGroup(options?: TaskGroupOptions)

export interface TaskGroupOptions {
  /** @default new Mutex({ concurrency: Mutex.MaximumConcurrency }) */
  mutex?: Mutex;
}
```

The mutex limits concurrent tasks. When omitted, `TaskGroup` creates one with a concurrency of `Mutex.MaximumConcurrency` (`1000`). Pass the same mutex to several groups to share one limit.

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `mutex` | `Mutex` | Concurrency limit used by the group. |
| `pendingCount` | `number` | Number of tasks running or waiting for a slot. |
| `failures` | `readonly TaskFailure[]` | Snapshot of failures collected since the last `drain()`. |

```ts
export interface TaskFailure {
  name: string;
  error: unknown;
}
```

## Methods

### `add(name: string, task: () => Promise<unknown>): void`

Schedules a task and returns immediately. The task starts when its mutex grants a slot.

`name` appears in `TaskFailure` and does not need to be unique. If the task throws or rejects, the group records the error for `failures` and `drain()`.

### `drain(): Promise<readonly TaskFailure[]>`

Waits for every task, including tasks added while the drain is in progress. It returns the collected failures and clears them. You may add more tasks after it resolves.

```ts
const tasks = new TaskGroup();

tasks.add("parent", async() => {
  // a task may schedule more work on its own group
  tasks.add("child", () => doSomething());
});

// Waits for both "parent" and "child".
await tasks.drain();
```

An empty group resolves immediately with `[]`. Concurrent `drain()` calls wait for the same tasks, but only one call receives each collected failure.

Use the `failures` property instead if you need to peek while tasks are still running.

### `TaskGroup.drain(...groups: TaskGroup[]): Promise<readonly TaskFailure[]>`

Static counterpart that drains several groups in parallel and returns their failures in one flat array. Groups sharing a `Mutex` are safe to drain this way, no group waits for another.

```ts
const failures = await TaskGroup.drain(downloads, uploads);
```

Failures are not tagged with the group they come from, so rely on `TaskFailure.name` to tell them apart. Called without any group, it resolves with `[]`.

### `[Symbol.asyncDispose](): Promise<void>`

Calls `drain()` and discards the returned failures. This method supports `await using`.

## Share a concurrency limit

Pass the same `Mutex` to each group:

```ts
import { Mutex, TaskGroup } from "@openally/mutex";

const budget = new Mutex({ concurrency: 10 });

const downloads = new TaskGroup({ mutex: budget });
const uploads = new TaskGroup({ mutex: budget });

downloads.add("download-avatar", () => downloadAvatar());
uploads.add("upload-report", () => uploadReport());

const failures = await TaskGroup.drain(downloads, uploads);
```

At most 10 tasks run across both groups. Give each group its own mutex for independent limits, or reuse an existing group's mutex with `new TaskGroup({ mutex: downloads.mutex })`.

> [!WARNING]
> Do not call `drain()` from a task that uses the same mutex as the group being drained. If every slot is held by a draining task, queued tasks cannot start.

Cancelling a shared mutex rejects queued acquisitions for every group that uses it. Already-running tasks continue. Each rejection is captured as a `TaskFailure`, so `drain()` still resolves:

```ts
budget.cancel();

const failures = await downloads.drain();
// [{ name: "...", error: MutexCanceledError }]
```

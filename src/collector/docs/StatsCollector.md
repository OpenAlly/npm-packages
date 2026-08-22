# StatsCollector

Records the duration and outcome of synchronous and asynchronous operations, exposing each recorded operation through [`operations`](#properties), [`stats`](#properties), and the [`operation`](#events) event.

## Usage

```ts
import { StatsCollector } from "@openally/collector";

const collector = new StatsCollector();

const response = await collector.track("fetch-user", () => fetch(url));
const user = await collector.track("parse-user", () => response.json());

console.log(collector.stats);
```

Sync stays synchronous. Thenables, including non-native implementations, return a native `Promise`, while thrown and rejected values pass through unchanged.

## Constructor

```ts
new StatsCollector<Phase, Meta, Err>(options?: StatsCollectorOptions<Err>)
```

Every type parameter is optional:

| Parameter | Default | Description |
| --- | --- | --- |
| `Phase` | `string` | String values accepted by [`phase()`](#phase). |
| `Meta` | `never` | Value returned by the `metadata` callback passed to [`track()`](#track). |
| `Err` | `CollectedError` | Shape produced by `serializeError`. Supply a serializer when using a custom shape. |

```ts
export type StatsCollectorOptions<Err extends CollectedError = CollectedError> = {
  /** @default Date.now */
  now?: () => number;
  /** @default performance.now */
  monotonicNow?: () => number;
  /** @default name, message and stack of native errors */
  serializeError?: (cause: unknown) => Err;
};
```

`now` supplies the UNIX timestamps stored in `startedAt`, while `monotonicNow` measures durations without being affected by wall-clock changes.

Inject both clocks to make timing deterministic in tests:

```ts
let time = 0;
const collector = new StatsCollector({
  now: () => time,
  monotonicNow: () => time++
});
```

`serializeError` converts a thrown value to `Err`. The default copies `name`, `message`, and `stack` from native errors, while other values become `{ name: "Error", message: String(cause) }` or `{ name: "Error" }` if string conversion fails. Supply a serializer for a custom `Err` type:

```ts
type HttpError = CollectedError & { statusCode?: number; };

const collector = new StatsCollector<string, never, HttpError>({
  serializeError: (cause) => ({
    name: "HTTPError",
    statusCode: isHTTPError(cause) ? cause.statusCode : undefined
  })
});
```

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `operations` | `readonly OperationStat<Phase, Meta, Err>[]` | Copy of every recorded operation, in settlement order. |
| `errors` | `readonly Err[]` | Errors of the rejected operations, derived from `operations`. |
| `stats` | `Stats<Phase, Meta, Err>` | Serializable snapshot of everything collected so far. |

`operations` and `errors` return copies, so mutating them never affects the collector.

```ts
export type Stats<Phase, Meta, Err> = {
  /** UNIX timestamp of the collector creation, or of the last reset() */
  startedAt: number;
  /** Time elapsed in milliseconds since startedAt */
  executionTime: number;
  operationCount: number;
  operations: readonly OperationStat<Phase, Meta, Err>[];
  errorCount: number;
  errors: readonly Err[];
};
```

## Methods

### `track()`

```ts
track<T>(
  name: string,
  fn: () => T,
  options?: TrackOptions<Awaited<T>, Meta>
): Tracked<T>
```

Runs `fn` and records its completion, returning synchronous values directly and converting thenables, including non-native thenables, to a `Promise<Awaited<T>>`. Thrown values and rejections are recorded before being rethrown unchanged.

```ts
export type TrackOptions<T, Meta> = {
  metadata?: (result: T) => Meta;
};
```

`metadata` runs only after fulfillment and stores its return value on the operation. Any error it throws propagates to the caller.

```ts
const collector = new StatsCollector<string, { filesCount: number; }>();

await collector.track("tarball", () => listFiles(path), {
  metadata: (files) => ({ filesCount: files.length })
});
```

### `phase()`

```ts
phase(phase: Phase): Tracker<Meta>
```

Returns a `track()` bound to `phase`, so every operation it records is attributed to that phase.

```ts
type Phase = "tree-walk" | "tarball-scan" | "metadata-fetch";

const collector = new StatsCollector<Phase>();
const fetching = collector.phase("metadata-fetch");

await Promise.all(
  packages.map((name) => fetching(name, () => registry.metadata(name)))
);
```

```ts
export type Tracker<Meta = never> = <T>(
  name: string,
  fn: () => T,
  options?: TrackOptions<Awaited<T>, Meta>
) => Tracked<T>;
```

### `reset()`

```ts
reset(): void
```

Drops every recorded operation and restarts both clocks, releasing the operations retained in memory since construction or the previous reset.

## Events

`StatsCollector` extends [`Emitter`](../../emitt), so listeners are registered with `on()`, `once()` and removed with `off()`.

| Event | Payload | Description |
| --- | --- | --- |
| `operation` | `OperationStat<Phase, Meta, Err>` | Emitted when an operation is recorded. |

```ts
collector.on("operation", (stat) => {
  console.log(`${stat.name} ${stat.status} in ${stat.executionTime}ms`);
});
```

## `OperationStat`

```ts
export type OperationStat<Phase, Meta, Err> = {
  name: string;
  phase?: Phase;
  /** UNIX timestamp taken just before the operation started */
  startedAt: number;
  /** Duration in milliseconds, measured on a monotonic clock */
  executionTime: number;
} & (
  | { status: "fulfilled"; metadata?: Meta; }
  | { status: "rejected"; error: Err; }
);
```

`status` discriminates the union, so narrowing it gives access to `metadata` or `error`:

```ts
for (const operation of collector.operations) {
  if (operation.status === "rejected") {
    console.error(`${operation.name} failed`, operation.error);
  }
}
```

`phase` is only set for operations tracked through [`phase()`](#phase).

## `CollectedError`

```ts
export type CollectedError = {
  name: string;
  message?: string;
  stack?: string;
};
```

Widen it through the `Err` type parameter of the constructor when you provide your own `serializeError`.

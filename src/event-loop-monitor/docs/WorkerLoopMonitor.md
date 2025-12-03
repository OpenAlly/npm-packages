# WorkerLoopMonitor

A class to monitor event loop utilization of one or multiple Node.js Worker threads.

## Usage

```ts
import { Worker } from "node:worker_threads";
import { WorkerLoopMonitor } from "@openally/event-loop-monitor";

const monitor = new WorkerLoopMonitor({
  maxEventLoopUtilization: 0.8
});

const worker1 = new Worker("./worker.js");
const worker2 = new Worker("./worker.js");

monitor.add(worker1, worker2);

console.log(monitor.isUnderPressure(worker1));

console.log(monitor.getUtilization(worker2));

console.log(monitor.getUtilization());

monitor.close();
```

## Constructor Options

```ts
interface WorkerLoopMonitorOptions {
  /**
   * Maximum event loop utilization ratio.
   * Must be between 0 and 1.
   * When exceeded, isUnderPressure() returns true.
   * @default 0.8
   */
  maxEventLoopUtilization?: number;

  /**
   * Interval in milliseconds between metric samples.
   * @default 1000
   */
  sampleInterval?: number;
}
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `size` | `number` | Number of workers currently being monitored |

## Methods

### `add(...worker: Worker[]): this`

Add a worker to monitor. Returns `this` for chaining.

### `remove(worker: Worker): boolean`

Remove a worker from monitoring. Returns `true` if the worker was found and removed.

### `getUtilization(): Map<number, number>`

Get a map of all workers' utilization, keyed by `threadId`.

### `getUtilization(worker: Worker): number | undefined`

Get the current event loop utilization for a specific worker.
Returns `undefined` if the worker is not being monitored.

### `isUnderPressure(worker: Worker): boolean`

Returns `true` if the specified worker exceeds `maxEventLoopUtilization`. Returns `false` if the worker is not being monitored.

### `close(): void`

Stops monitoring and cleans up internal resources.

### `[Symbol.dispose](): void`

Alias for `close()`. Enables usage with the `using` keyword.

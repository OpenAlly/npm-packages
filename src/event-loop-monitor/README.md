<p align="center"><h1 align="center">
  Event Loop Monitor
</h1>

<p align="center">
  Event Loop Monitor for Node.js to track event loop delay and utilization. This is a minimal framework agnostic fork of <a href="https://github.com/fastify/under-pressure">@fastify/under-pressure</a>
</p>

## Requirements
- [Node.js](https://nodejs.org/en/) v24 or higher

## Features

Here is the list of measured metrics:

- **Event loop Delay** - Measures the delay in milliseconds between scheduled and actual execution time. Uses [`monitorEventLoopDelay`](https://nodejs.org/api/perf_hooks.html#perf_hooks_perf_hooks_monitoreventloopdelay_options) when available.
- **Event loop Utilization** - Ratio between active and idle time (value between 0 and 1). Uses [`eventLoopUtilization`](https://nodejs.org/api/perf_hooks.html#performanceeventlooputilizationutilization1-utilization2) to calculate this metric.
- **Heap usage** - Memory allocated on the V8 heap (`heapUsed`)
- **RSS** - Resident Set Size, total memory allocated for the process
- **Worker threads ELU** - Monitor Event Loop Utilization of Worker threads from the main thread.

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i @openally/event-loop-monitor
# or
$ yarn add @openally/event-loop-monitor
```

## Usage example

```ts
import { EventLoopMonitor } from "@openally/event-loop-monitor";

const elm = new EventLoopMonitor({
  maxEventLoopDelay: 250,
  maxEventLoopUtilization: 0.8
});

console.log(elm.isUnderPressure());

elm.close();
```

> [!TIP]
> The class implements `Symbol.dispose`, allowing automatic cleanup with the `using` keyword.

## How it works

### Event Loop Delay

The event loop delay measures the time difference between when a timer is scheduled to run and when it actually runs. Under heavy load, this delay increases because the event loop is busy processing other operations.

For example, if you schedule a timer to run in 100ms but it actually runs after 150ms, the event loop delay is 50ms. High delays indicate that your application might be struggling to keep up with the workload.

The `maxEventLoopDelay` option sets a threshold (in milliseconds). When the measured delay exceeds this threshold, the system is considered "under pressure".

### Event Loop Utilization (ELU)

Event Loop Utilization is the ratio of time the event loop spends in the "active" state (processing callbacks) versus the "idle" state (waiting for I/O).

- A value of `0` means the event loop is completely idle
- A value of `1` means the event loop is constantly busy with no idle time

For example, an ELU of `0.85` means the event loop is active 85% of the time. High utilization values indicate heavy CPU-bound work.

The `maxEventLoopUtilization` option sets a threshold (between 0 and 1). When utilization exceeds this threshold, the system is considered "under pressure".

### Memory Metrics

- **Heap Used** (`maxHeapUsedBytes`): The amount of memory used by JavaScript objects. When this exceeds the threshold, it may indicate memory leaks or excessive object creation.
- **RSS** (`maxRssBytes`): The total memory allocated for the process, including code, stack, and heap. This is the "real" memory footprint as seen by the operating system.

## API

- [EventLoopMonitor](./docs/EventLoopMonitor.md) - Main class to monitor event loop and memory metrics
- [WorkerLoopMonitor](./docs/WorkerLoopMonitor.md) - Monitor event loop utilization of Worker threads

## Example: HTTP Server Health Check

A common use case is to implement a health check endpoint that returns `503 Service Unavailable` when the server is under pressure. This allows load balancers to route traffic away from overloaded instances.

```ts
import { createServer } from "node:http";
import { EventLoopMonitor } from "@openally/event-loop-monitor";

const monitor = new EventLoopMonitor({
  maxEventLoopDelay: 200,
  maxHeapUsedBytes: 200 * 1024 * 1024, // 200 MB
  maxEventLoopUtilization: 0.85
});

const server = createServer((req, res) => {
  if (req.url === "/health") {
    if (monitor.isUnderPressure()) {
      res.writeHead(503);
      res.end("Service Unavailable");
    } else {
      res.writeHead(200);
      res.end("OK");
    }
    return;
  }
  // ... handle other routes
});

server.listen(3000);
```

## Acknowledgements

This project is a framework-agnostic fork of [@fastify/under-pressure](https://github.com/fastify/under-pressure). Thanks to the Fastify team for the original implementation.

## License
MIT

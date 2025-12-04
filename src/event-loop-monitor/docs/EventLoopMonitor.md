# EventLoopMonitor

The main class that monitors the Node.js event loop and memory usage.

## Constructor Options

```ts
interface EventLoopMonitorOptions {
  /**
   * Maximum event loop delay in milliseconds.
   * When exceeded, isUnderPressure() returns true.
   * @default 0 (disabled)
   */
  maxEventLoopDelay?: number;

  /**
   * Maximum heap memory usage in bytes.
   * When exceeded, isUnderPressure() returns true.
   * @default 0 (disabled)
   */
  maxHeapUsedBytes?: number;

  /**
   * Maximum RSS (Resident Set Size) in bytes.
   * When exceeded, isUnderPressure() returns true.
   * @default 0 (disabled)
   */
  maxRssBytes?: number;

  /**
   * Maximum event loop utilization ratio.
   * Must be between 0 and 1.
   * When exceeded, isUnderPressure() returns true.
   * @default 0 (disabled)
   */
  maxEventLoopUtilization?: number;

  /**
   * Interval in milliseconds between metric samples.
   * Minimum value is 10ms (the histogram resolution).
   * @default 1000
   */
  sampleInterval?: number;
}
```

> [!NOTE]
> Setting a threshold to `0` disables that particular check.

## Static Properties

| Property | Type | Description |
|----------|------|-------------|
| `resolution` | `number` | Histogram resolution in milliseconds. Default: `10` |

## Methods

### `getUtilization(): EventLoopUtilizationMetrics`

Returns the current event loop and memory utilization metrics.
```ts
interface EventLoopUtilizationMetrics {
  /**
   * Event loop utilization ratio between 0 and 1.
   * Represents the percentage of time the event loop was active vs idle.
   */
  utilized: number;

  /**
   * Event loop delay in milliseconds.
   * Higher values indicate the event loop is blocked by long-running operations.
   */
  delay: number;

  /**
   * Current V8 heap memory usage in bytes.
   */
  heapUsed?: number;

  /**
   * Resident Set Size - total memory allocated for the process in bytes.
   */
  rss?: number;
}
```

**Example:**

```ts
using monitor = new EventLoopMonitor({
  maxEventLoopDelay: 100,
  sampleInterval: 500
});

const metrics = monitor.getUtilization();
console.log(`Event loop utilization: ${(metrics.utilized * 100).toFixed(2)}%`);
console.log(`Event loop delay: ${metrics.delay.toFixed(2)}ms`);
```

### `isUnderPressure(): boolean`

Returns `true` if any of the configured thresholds are exceeded:
- Event loop delay > `maxEventLoopDelay`
- Heap used > `maxHeapUsedBytes`
- RSS > `maxRssBytes`
- Event loop utilization > `maxEventLoopUtilization`

### `close(): void`

Stops monitoring and cleans up internal resources (timer and histogram). 
Should be called when the monitor is no longer needed.

### `[Symbol.dispose](): void`

Alias for `close()`. Enables usage with the `using` keyword for automatic resource management.

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

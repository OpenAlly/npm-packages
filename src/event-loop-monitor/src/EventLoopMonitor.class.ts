// Import Node.js Dependencies
import process from "node:process";
import {
  performance,
  monitorEventLoopDelay,
  type IntervalHistogram,
  type EventLoopUtilization
} from "node:perf_hooks";

// CONSTANTS
const kDefaultMaxOptions = {
  maxEventLoopDelay: 0,
  maxHeapUsedBytes: 0,
  maxRssBytes: 0,
  maxEventLoopUtilization: 0
};

export interface EventLoopMonitorOptions {
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

export interface EventLoopUtilizationMetrics {
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

export class EventLoopMonitor {
  static resolution = 10;

  #histogram: IntervalHistogram;
  #elu: EventLoopUtilization;
  #memory: NodeJS.MemoryUsage = process.memoryUsage();
  #loop = {
    utilized: 0,
    delay: 0
  };
  #maxUsages: Omit<EventLoopMonitorOptions, "sampleInterval"> = {};
  #timer: NodeJS.Timeout;

  constructor(
    options: EventLoopMonitorOptions = {}
  ) {
    const {
      sampleInterval = 1000,
      ...maxOptions
    } = options;

    this.#maxUsages = Object.assign(
      structuredClone(kDefaultMaxOptions),
      maxOptions
    );
    this.#maxUsages.maxEventLoopUtilization = Math.min(
      Math.max(0, this.#maxUsages.maxEventLoopUtilization ?? 0),
      1
    );
    this.#histogram = monitorEventLoopDelay({
      resolution: EventLoopMonitor.resolution
    });
    this.#histogram.enable();

    this.#elu = performance.eventLoopUtilization();

    this.#timer = setTimeout(
      this.#update.bind(this),
      Math.max(sampleInterval, EventLoopMonitor.resolution)
    );
    this.#timer.unref();
  }

  #update() {
    this.#memory = process.memoryUsage();
    this.#updateEventLoop();
    this.#histogram.reset();
    this.#timer.refresh();
  }

  #updateEventLoop() {
    let delay = Math.max(0, (this.#histogram.mean / 1e6) - EventLoopMonitor.resolution);
    if (Number.isNaN(delay)) {
      delay = Infinity;
    }

    this.#loop = {
      utilized: performance.eventLoopUtilization(this.#elu).utilization,
      delay
    };
  }

  getUtilization(): EventLoopUtilizationMetrics {
    return {
      utilized: this.#loop.utilized,
      delay: this.#loop.delay,
      heapUsed: this.#memory.heapUsed,
      rss: this.#memory.rss
    };
  }

  isUnderPressure(): boolean {
    if (
      this.#maxUsages.maxEventLoopDelay &&
      this.#loop.delay > this.#maxUsages.maxEventLoopDelay
    ) {
      return true;
    }

    if (
      this.#maxUsages.maxHeapUsedBytes &&
      this.#memory.heapUsed > this.#maxUsages.maxHeapUsedBytes
    ) {
      return true;
    }

    if (
      this.#maxUsages.maxRssBytes &&
      this.#memory.rss > this.#maxUsages.maxRssBytes
    ) {
      return true;
    }

    return typeof this.#maxUsages.maxEventLoopUtilization === "number" &&
      this.#loop.utilized > this.#maxUsages.maxEventLoopUtilization;
  }

  [Symbol.dispose]() {
    this.close();
  }

  close() {
    clearTimeout(this.#timer);
    this.#histogram.disable();
  }
}

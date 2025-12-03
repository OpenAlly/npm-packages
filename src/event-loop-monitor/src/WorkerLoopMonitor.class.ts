// Import Node.js Dependencies
import type { Worker } from "node:worker_threads";
import type { EventLoopUtilization } from "node:perf_hooks";

export interface WorkerLoopMonitorOptions {
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

interface TrackedWorker {
  worker: Worker;
  elu: EventLoopUtilization;
  utilized: number;
}

export class WorkerLoopMonitor {
  #workers: Map<number, TrackedWorker> = new Map();
  #maxEventLoopUtilization: number;
  #timer: NodeJS.Timeout;

  constructor(
    options: WorkerLoopMonitorOptions = {}
  ) {
    const {
      sampleInterval = 1000,
      maxEventLoopUtilization = 0.8
    } = options;

    this.#maxEventLoopUtilization = Math.min(
      Math.max(0, maxEventLoopUtilization),
      1
    );

    this.#timer = setTimeout(
      this.#update.bind(this),
      Math.max(sampleInterval, 10)
    );
    this.#timer.unref();
  }

  #update() {
    for (const tracked of this.#workers.values()) {
      tracked.utilized = tracked.worker.performance.eventLoopUtilization(
        tracked.elu
      ).utilization;
    }
    this.#timer.refresh();
  }

  add(...workers: Worker[]): this {
    for (const worker of workers) {
      if (this.#workers.has(worker.threadId)) {
        continue;
      }

      this.#workers.set(worker.threadId, {
        worker,
        elu: worker.performance.eventLoopUtilization(),
        utilized: 0
      });
    }

    return this;
  }

  remove(worker: Worker): boolean {
    return this.#workers.delete(worker.threadId);
  }

  get size(): number {
    return this.#workers.size;
  }

  getUtilization(): Map<number, number>;
  getUtilization(worker: Worker): number | undefined;
  getUtilization(worker?: Worker): Map<number, number> | number | undefined {
    if (worker === undefined) {
      const result = new Map<number, number>();
      for (const [threadId, tracked] of this.#workers) {
        result.set(threadId, tracked.utilized);
      }

      return result;
    }

    return this.#workers.get(worker.threadId)?.utilized;
  }

  isUnderPressure(worker: Worker): boolean {
    const tracked = this.#workers.get(worker.threadId);
    if (!tracked) {
      return false;
    }

    return tracked.utilized > this.#maxEventLoopUtilization;
  }

  [Symbol.dispose]() {
    this.close();
  }

  close() {
    clearTimeout(this.#timer);
    this.#workers.clear();
  }
}

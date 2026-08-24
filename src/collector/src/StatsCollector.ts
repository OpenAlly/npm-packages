// Import Third-party Dependencies
import { Emitter } from "@openally/emitt";

// Import Internal Dependencies
import {
  isThenable,
  serializeError
} from "./utils.ts";
import type {
  CollectedError,
  CollectorEvents,
  OperationStat,
  Stats,
  StatsCollectorOptions,
  TrackOptions,
  Tracked,
  Tracker
} from "./types.ts";

type InternalTrackOptions<
  Phase extends string,
  Meta
> = TrackOptions<unknown, Meta> & {
  phase?: Phase;
};

/**
 * Tracks sync and async operations,
 * recording one {@link OperationStat} per call.
 *
 * @example
 * const collector = new StatsCollector<"fetch" | "parse">();
 * const fetch = collector.phase("fetch");
 * await fetch("registry", () => httpGet(url));
 */
export class StatsCollector<
  Phase extends string = string,
  Meta = never,
  Err extends CollectedError = CollectedError
> extends Emitter<CollectorEvents<Phase, Meta, Err>> {
  #now: () => number;
  #monotonicNow: () => number;
  #serializeError: (cause: unknown) => Err;

  #operations: OperationStat<Phase, Meta, Err>[] = [];
  #startedAt: number;
  #startedAtMark: number;

  constructor(
    options: StatsCollectorOptions<Err> = {}
  ) {
    super();

    const {
      now = Date.now,
      monotonicNow = performance.now.bind(performance),
      /*
       * Default `serializeError` supports the default `Err`.
       * Custom types require a serializer.
       */
      serializeError: serialize = serializeError as (cause: unknown) => Err
    } = options;

    this.#now = now;
    this.#monotonicNow = monotonicNow;
    this.#serializeError = serialize;
    this.#startedAt = now();
    this.#startedAtMark = monotonicNow();
  }

  track<T>(
    name: string,
    fn: () => T,
    options?: TrackOptions<Awaited<T>, Meta>
  ): Tracked<T>;
  track<T>(
    name: string,
    fn: () => T,
    options?: TrackOptions<Awaited<T>, Meta>
  ): unknown {
    return this.#track(name, fn, options);
  }

  /**
   * Returns a {@link Tracker} bound to `phase`.
   */
  phase(
    phase: Phase
  ): Tracker<Meta> {
    const self = this;

    function tracker<T>(
      name: string,
      fn: () => T,
      options?: TrackOptions<Awaited<T>, Meta>
    ): Tracked<T>;
    function tracker(
      name: string,
      fn: () => unknown,
      options?: TrackOptions<unknown, Meta>
    ): unknown {
      return self.#track(
        name,
        fn,
        { ...options, phase }
      );
    }

    return tracker;
  }

  get operations(): readonly OperationStat<Phase, Meta, Err>[] {
    return [...this.#operations];
  }

  get errors(): readonly Err[] {
    return this.#operations.flatMap(
      (operation) => (operation.status === "rejected" ? [operation.error] : [])
    );
  }

  get stats(): Stats<Phase, Meta, Err> {
    const operations = this.operations;
    const errors = this.errors;

    return {
      startedAt: this.#startedAt,
      executionTime: this.#monotonicNow() - this.#startedAtMark,
      operationCount: operations.length,
      operations,
      errorCount: errors.length,
      errors
    };
  }

  reset(): void {
    this.#operations = [];
    this.#startedAt = this.#now();
    this.#startedAtMark = this.#monotonicNow();
  }

  #track(
    name: string,
    fn: () => unknown,
    options: InternalTrackOptions<Phase, Meta> = {}
  ): unknown {
    const { phase, metadata } = options;
    const startedAt = this.#now();
    const mark = this.#monotonicNow();

    const fulfilled = (result: unknown): unknown => {
      this.#record({
        name,
        phase,
        startedAt,
        executionTime: this.#monotonicNow() - mark,
        status: "fulfilled",
        metadata: metadata?.(result)
      });

      return result;
    };

    const rejected = (cause: unknown): never => {
      this.#record({
        name,
        phase,
        startedAt,
        executionTime: this.#monotonicNow() - mark,
        status: "rejected",
        error: this.#serializeError(cause)
      });

      throw cause;
    };

    try {
      const result = fn();
      if (isThenable(result)) {
        return Promise.resolve(result).then(
          fulfilled,
          rejected
        );
      }

      fulfilled(result);

      return result;
    }
    catch (cause) {
      return rejected(cause);
    }
  }

  #record(
    stat: OperationStat<Phase, Meta, Err>
  ): void {
    this.#operations.push(stat);
    this.emit("operation", stat);
  }
}

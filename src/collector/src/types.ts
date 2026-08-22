/**
 * Serializable error shape customized through `Err` and `serializeError`.
 */
export type CollectedError = {
  name: string;
  message?: string;
  stack?: string;
};

export type OperationStat<
  Phase extends string = string,
  Meta = never,
  Err extends CollectedError = CollectedError
> = {
  name: string;
  /**
   * Phase assigned by `StatsCollector.phase()`.
   */
  phase?: Phase;
  /**
   * Start time as a UNIX timestamp.
   */
  startedAt: number;
  /**
   * Duration in milliseconds from a monotonic clock.
   */
  executionTime: number;
} & (
  | { status: "fulfilled"; metadata?: Meta; }
  | { status: "rejected"; error: Err; }
);

/**
 * Serializable collector snapshot.
 */
export type Stats<
  Phase extends string = string,
  Meta = never,
  Err extends CollectedError = CollectedError
> = {
  /**
   * UNIX timestamp of construction or the last `reset()`.
   */
  startedAt: number;
  /**
   * Milliseconds elapsed since `startedAt`.
   */
  executionTime: number;
  operationCount: number;
  operations: readonly OperationStat<Phase, Meta, Err>[];
  errorCount: number;
  errors: readonly Err[];
};

export type TrackOptions<Value, Meta> = {
  /**
   * Builds metadata after fulfillment.
   */
  metadata?(result: Value): Meta;
};

type Thenable = object & {
  then(...args: never[]): unknown;
};

export type Tracked<T> = T extends Thenable
  ? Promise<Awaited<T>>
  : T;

export type Tracker<Meta = never> = <T>(
  name: string,
  fn: () => T,
  options?: TrackOptions<Awaited<T>, Meta>
) => Tracked<T>;

export type StatsCollectorOptions<
  Err extends CollectedError = CollectedError
> = {
  /**
   * Wall clock for `startedAt`
   * @default `Date.now`
   */
  now?: () => number;
  /**
   * Duration clock immune to wall-clock jumps
   * @default `performance.now`
   */
  monotonicNow?: () => number;
  /**
   * Maps thrown values to errors.
   * Custom `Err` types require this option.
   */
  serializeError?: (cause: unknown) => Err;
};

export type CollectorEvents<
  Phase extends string = string,
  Meta = never,
  Err extends CollectedError = CollectedError
> = {
  operation: (stat: OperationStat<Phase, Meta, Err>) => void;
};

export type MutexAbortType = "API" | "AbortSignal";

export class MutexCanceledError extends Error {
  /**
   * Cancellation source.
   */
  readonly abortType: MutexAbortType;

  constructor(
    abortType: MutexAbortType = "API"
  ) {
    super(`Mutex Canceled (${abortType})`);

    this.name = this.constructor.name;
    this.abortType = abortType;
  }
}

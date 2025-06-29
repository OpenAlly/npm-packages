// Import Node.js Dependencies
import { EventEmitter } from "node:events";
import * as crypto from "node:crypto";
import { clearTimeout } from "node:timers";

export interface MutexOptions {
  /**
   * @default 5
   */
  concurrency?: number;

  /**
   * If disabled it will unref() Node.js timers (allowing to not keep event loop alive).
   *
   * @default true
   */
  keepReferencingTimers?: boolean;
}

export interface MutexAcquireOptions {
  /**
   * AbortSignal to be able to define a maximum time to wait before abortion of lock acquisition.
   */
  signal?: AbortSignal;

  /**
   * When acquired, define a maximum delay before automatic release.
   *
   * No automatic release by default
   */
  delayBeforeAutomaticRelease?: number;
}

export const MutexRelease = Symbol("MutexRelease");

export class Mutex extends EventEmitter {
  static MaximumConcurrency = 1_000;

  #canceled = false;
  #keepReferencingTimers = true;
  #waitings: [(value: void) => void, (reason?: string | Error) => void, string][] = [];
  #concurrency = 5;
  #current = 0;

  constructor(options: MutexOptions = Object.create(null)) {
    super();
    const { concurrency = 5, keepReferencingTimers = true } = options;

    this.#keepReferencingTimers = keepReferencingTimers;
    this.#concurrency = Math.min(Math.max(concurrency, 1), Mutex.MaximumConcurrency);
  }

  get concurrency() {
    return this.#concurrency;
  }

  get running() {
    return this.#current;
  }

  get locked() {
    return this.#current >= this.#concurrency;
  }

  cancel() {
    this.#canceled = true;
    this.#current = 0;

    for (const [, reject] of this.#waitings) {
      reject(new MutexCanceledError());
    }
    this.#waitings = [];

    return this;
  }

  reset() {
    if (this.locked) {
      this.cancel();
    }
    this.#canceled = false;

    return this;
  }

  async acquire(options: MutexAcquireOptions = {}) {
    const { signal, delayBeforeAutomaticRelease = null } = options;

    if (this.#canceled || signal?.aborted) {
      throw new MutexCanceledError(signal?.aborted ? "AbortSignal" : "API");
    }

    if (this.locked) {
      if (signal) {
        await this.lockWithSignal(signal);
      }
      else {
        await this.lockWithoutSignal();
      }
    }
    this.#current++;

    let isReleased = false;
    const timer = delayBeforeAutomaticRelease === null ?
      null :
      setTimeout(() => {
        isReleased = true;
        this.release();
      }, delayBeforeAutomaticRelease);
    if (!this.#keepReferencingTimers && timer !== null) {
      timer.unref();
    }

    const free = () => {
      if (isReleased) {
        return;
      }

      if (timer !== null) {
        clearTimeout(timer);
      }
      this.release();
    };

    free[Symbol.dispose] = () => {
      free();
    };

    return free;
  }

  private async lockWithSignal(
    signal: AbortSignal
  ) {
    const task = new AbortController();
    const id = crypto.randomBytes(6).toString("hex");

    try {
      const { resolve, reject, promise } = Promise.withResolvers<void>();

      signal.addEventListener("abort", () => this.releaseID(id), {
        once: true,
        signal: task.signal
      });

      this.#waitings.push([resolve, reject, id]);

      await promise;
    }
    finally {
      task.abort();
    }
  }

  private async lockWithoutSignal() {
    const { resolve, reject, promise } = Promise.withResolvers<void>();

    this.#waitings.push([resolve, reject, ""]);
    await promise;
  }

  private releaseID(id: string) {
    const index = this.#waitings.findIndex((value) => value[2] === id);
    if (index === -1) {
      return;
    }

    const [, reject] = this.#waitings[index];
    reject(new MutexCanceledError("AbortSignal"));

    this.#waitings.splice(index, 1);
    if (this.#current > 0) {
      this.#current--;
    }
  }

  release() {
    if (this.running === 0) {
      return this;
    }

    this.emit(MutexRelease);
    this.#current--;
    const promiseArg = this.#waitings.shift();
    if (typeof promiseArg === "undefined") {
      return this;
    }

    const [resolve] = promiseArg;
    if (resolve) {
      resolve(void 0);
    }

    return this;
  }
}

export class MutexCanceledError extends Error {
  constructor(abortType: "API" | "AbortSignal" = "API") {
    super(`Mutex Canceled (${abortType})`);

    this.name = this.constructor.name;
  }
}

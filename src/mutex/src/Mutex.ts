// Import Node.js Dependencies
import { EventEmitter } from "node:events";
import { clearTimeout } from "node:timers";

// Import Internal Dependencies
import { MutexCanceledError } from "./errors/MutexCanceledError.ts";

export interface MutexOptions {
  /**
   * @default 5
   */
  concurrency?: number;

  /**
   * Keeps automatic-release timers referenced.
   *
   * @default true
   */
  keepReferencingTimers?: boolean;
}

export interface MutexAcquireOptions {
  /**
   * Aborts lock acquisition.
   */
  signal?: AbortSignal;

  /**
   * Milliseconds before automatic release.
   */
  delayBeforeAutomaticRelease?: number;
}

/**
 * Releases the acquired slot at most once.
 */
export type MutexFree = (() => void) & Disposable;

interface MutexWaiter {
  resolve: () => void;
  reject: (reason: Error) => void;
}

export const MutexRelease = Symbol("MutexRelease");

export class Mutex extends EventEmitter {
  static MaximumConcurrency = 1_000;

  #canceled = false;
  #keepReferencingTimers = true;
  #waitings: MutexWaiter[] = [];
  #concurrency = 5;
  #current = 0;

  constructor(
    options: MutexOptions = {}
  ) {
    super();
    const {
      concurrency = 5,
      keepReferencingTimers = true
    } = options;

    this.#keepReferencingTimers = keepReferencingTimers;
    this.#concurrency = Math.min(
      Math.max(concurrency, 1),
      Mutex.MaximumConcurrency
    );
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

    const waitings = this.#waitings;
    this.#waitings = [];
    for (const { reject } of waitings) {
      reject(new MutexCanceledError());
    }

    return this;
  }

  reset() {
    this.cancel();
    this.#canceled = false;

    return this;
  }

  async acquire(
    options: MutexAcquireOptions = {}
  ): Promise<MutexFree> {
    const {
      signal,
      delayBeforeAutomaticRelease = null
    } = options;

    if (this.#canceled || signal?.aborted) {
      throw new MutexCanceledError(
        signal?.aborted ? "AbortSignal" : "API"
      );
    }

    if (this.locked) {
      // release() transferred the slot without decrementing #current.
      await this.#wait(signal);
    }
    else {
      this.#current++;
    }

    let isReleased = false;
    const timer = delayBeforeAutomaticRelease === null ?
      null :
      setTimeout(() => {
        isReleased = true;
        this.release();
      }, delayBeforeAutomaticRelease);
    if (timer !== null && !this.#keepReferencingTimers) {
      timer.unref();
    }

    const free = () => {
      if (isReleased) {
        return;
      }
      isReleased = true;

      if (timer !== null) {
        clearTimeout(timer);
      }
      this.release();
    };

    return Object.assign(free, {
      [Symbol.dispose]: free
    });
  }

  release() {
    if (this.#current === 0) {
      return this;
    }

    const waiter = this.#waitings.shift();
    if (waiter) {
      /*
       * The waiter inherits the slot without changing #current.
       */
      waiter.resolve();
    }
    else {
      this.#current--;
    }
    this.emit(MutexRelease);

    return this;
  }

  async #wait(
    signal?: AbortSignal
  ): Promise<void> {
    const {
      promise,
      resolve,
      reject
    } = Promise.withResolvers<void>();
    const waiter: MutexWaiter = {
      resolve,
      reject
    };

    this.#waitings.push(waiter);
    if (!signal) {
      return promise;
    }

    const listener = new AbortController();
    signal.addEventListener("abort", () => this.#abort(waiter), {
      once: true,
      signal: listener.signal
    });

    return promise.finally(() => listener.abort());
  }

  #abort(
    waiter: MutexWaiter
  ) {
    const index = this.#waitings.indexOf(waiter);
    if (index === -1) {
      return;
    }

    this.#waitings.splice(index, 1);
    waiter.reject(new MutexCanceledError("AbortSignal"));
  }
}

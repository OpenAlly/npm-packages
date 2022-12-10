/* eslint-disable @typescript-eslint/no-non-null-assertion */

// Import Node.js Dependencies
import { EventEmitter } from "node:events";

// Import Internal Dependencies
import { tSv, tSvIdentifier, tSvResponse, TSV_SYMBOL } from "./TimeValue";

// CONSTANTS
const kUniqueNullValue = Symbol("UniqueNullValue");

export interface ITimeStoreConstructorOptions {
  /**
   * Time To Live (Lifetime of stored identifiers).
   */
  ttl: number;
  /**
   * Automatically expire identifiers when Node.js process "exit" event is triggered.
   *
   * @see https://nodejs.org/api/process.html#event-exit
   * @default false
   */
  expireIdentifiersOnProcessExit?: boolean;
  /**
   * Provide an additional EventEmitter to use for broadcasting events
   */
  eventEmitter?: EventEmitter;

  /**
   * If enabled the internal timer will not be unreferenced
   *
   * @see https://nodejs.org/dist/latest-v18.x/docs/api/timers.html#timeoutunref
   * @default false
   */
  keepEventLoopAlive?: boolean;
}

export interface ITimeStoreAddOptions {
  /**
   * Time To Live for the given identifier.
   * If no value provided it will take the class TTL value.
   */
  ttl?: number;
}

export type TimeStoreIdentifier = string | symbol | number | boolean | bigint | object | null;

type InternalTimeStoreMapValue = {
  timestamp: number;
  ttl: number;
};

export class TimeStore extends EventEmitter {
  static Expired = Symbol.for("ExpiredTimeStoreEntry");
  static Renewed = Symbol.for("RenewedTimeStoreEntry");

  #keepEventLoopAlive: boolean;
  #identifiers: Map<TimeStoreIdentifier, InternalTimeStoreMapValue> = new Map();
  #ttl: number;
  #current: { identifier: TimeStoreIdentifier, ttl: number } = { identifier: kUniqueNullValue, ttl: 0 };
  #timer: NodeJS.Timeout | null = null;
  #customEventEmitter: EventEmitter | null = null;

  constructor(options: ITimeStoreConstructorOptions) {
    super();
    const {
      ttl,
      expireIdentifiersOnProcessExit = false,
      keepEventLoopAlive = false,
      eventEmitter = null
    } = options;

    this.#ttl = ttl;
    this.#customEventEmitter = eventEmitter;
    this.#keepEventLoopAlive = keepEventLoopAlive;

    process.on("exit", () => {
      if (expireIdentifiersOnProcessExit) {
        for (const identifier of this.#identifiers.keys()) {
          this.emit(TimeStore.Expired, identifier);
        }
      }
      this.clear();
    });
  }

  get ttl() {
    return this.#ttl;
  }

  addTsv(data: tSvResponse) {
    if (!data[TSV_SYMBOL]) {
      return this;
    }
    const { value, ttl } = data;

    return this.add(value, { ttl });
  }

  add(
    identifier: TimeStoreIdentifier,
    options: ITimeStoreAddOptions = {}
  ) {
    const { ttl = this.#ttl } = options;

    const hasIdentifier = this.#identifiers.has(identifier);
    const timestamp = Date.now();

    this.#identifiers.set(identifier, { timestamp, ttl });
    if (hasIdentifier) {
      this.emit(TimeStore.Renewed, identifier);
      this.#customEventEmitter?.emit(TimeStore.Renewed, identifier);
    }

    if (this.#timer === null) {
      this.#setNewUpfrontIdentifier(identifier, ttl);
    }
    else if (
      this.#current.identifier === identifier ||
      this.#hasTTLUnderCurrentIdentifier(timestamp, ttl)
    ) {
      this.#updateTimeStoreInterval();
    }

    return this;
  }

  delete(identifier: TimeStoreIdentifier) {
    this.#identifiers.delete(identifier);
    if (this.#current.identifier === identifier) {
      this.#updateTimeStoreInterval();
    }

    return this;
  }

  clear() {
    this.#resetTimerAndCurrentIdentifier();
    this.#identifiers.clear();

    return this;
  }

  #hasTTLUnderCurrentIdentifier(now: number, ttl: number) {
    const delta = now - this.#identifiers.get(this.#current.identifier)!.timestamp;

    return this.#current.ttl - delta >= ttl;
  }

  #updateTimeStoreInterval(): void {
    this.#resetTimerAndCurrentIdentifier();
    if (this.#identifiers.size === 0) {
      return;
    }

    // Sort identifiers by their timestamp
    const sortedIdentifiers = [...this.#identifiers.entries()]
      .sort((left, right) => (right[1].timestamp + right[1].ttl) - (left[1].timestamp + left[1].ttl));

    while (sortedIdentifiers.length > 0) {
      const [identifier, value] = sortedIdentifiers.pop()!;
      const delta = Date.now() - value.timestamp;

      // If current key is expired
      if (delta >= value.ttl) {
        this.emit(TimeStore.Expired, identifier);
      }
      else {
        this.#setNewUpfrontIdentifier(identifier, value.ttl - delta);
        break;
      }
    }
  }

  #resetTimerAndCurrentIdentifier() {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }

    // Note: we use a Symbol() to avoid collisions with primitives like null
    this.#current = { identifier: kUniqueNullValue, ttl: 0 };
  }

  #setNewUpfrontIdentifier(identifier: TimeStoreIdentifier, ttl = this.#ttl) {
    this.#current = { identifier, ttl };
    this.#timer = setTimeout(() => {
      this.delete(identifier);
      this.emit(TimeStore.Expired, identifier);
      this.#customEventEmitter?.emit(TimeStore.Expired, identifier);
    }, ttl);

    if (!this.#keepEventLoopAlive) {
      this.#timer.unref();
    }
  }
}

export { tSv, tSvIdentifier, tSvResponse, TSV_SYMBOL };

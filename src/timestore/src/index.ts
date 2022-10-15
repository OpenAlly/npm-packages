/* eslint-disable @typescript-eslint/no-non-null-assertion */

// Import Node.js Dependencies
import { EventEmitter } from "node:events";

export interface ITimeStoreConstructorOptions {
  /**
   * Time To Live
   */
  ttl: number;
}

export type TimeStoreIdentifier = string | symbol | number | boolean | bigint | object | null;
export type TimeStoreTimestamp = number;

// CONSTANTS
const kLocalWeakTimeStore = new WeakMap<TimeStore, Map<TimeStoreIdentifier, TimeStoreTimestamp>>();

const kUniqueNullValue = Symbol("UniqueNullValue");
const kSymbolTimer = Symbol("TimeStoreTimer");
const kSymbolIdentifier = Symbol("TimeStoreIdentifier");
const kSymbolTTL = Symbol("TimeStoreTTL");

export class TimeStore extends EventEmitter {
  static Expired = Symbol.for("ExpiredTimeStoreEntry");

  constructor(options: ITimeStoreConstructorOptions) {
    super();

    kLocalWeakTimeStore.set(this, new Map());
    Object.defineProperty(this, kSymbolTimer, {
      writable: true,
      value: null
    });
    Object.defineProperty(this, kSymbolIdentifier, {
      writable: true,
      value: null
    });
    Object.defineProperty(this, kSymbolTTL, { value: options.ttl });

    process.on("exit", () => {
      const curr = kLocalWeakTimeStore.get(this)!;

      for (const identifier of curr.keys()) {
        this.emit(TimeStore.Expired, identifier);
      }
      this.clear();
    });
  }

  #clearTimeout() {
    if (this[kSymbolTimer] !== null) {
      clearTimeout(this[kSymbolTimer]);
      this[kSymbolTimer] = null;
    }
  }

  protected add(identifier: TimeStoreIdentifier) {
    const curr = kLocalWeakTimeStore.get(this)!;
    const ts = Date.now();

    const isCurrentIdentifier = this[kSymbolIdentifier] === identifier;
    if (isCurrentIdentifier || this[kSymbolTimer] === null) {
      if (isCurrentIdentifier && this[kSymbolTimer] !== null) {
        clearTimeout(this[kSymbolTimer]);
      }
      else {
        this[kSymbolIdentifier] = identifier;
      }

      this[kSymbolTimer] = setTimeout(() => {
        this.emit(TimeStore.Expired, identifier);
      }, this[kSymbolTTL]).unref();
    }

    curr.set(identifier, ts);
  }

  protected delete(identifier: TimeStoreIdentifier) {
    const curr = kLocalWeakTimeStore.get(this)!;

    curr.delete(identifier);
    if (this[kSymbolIdentifier] === identifier) {
      this.#clearTimeout();
      if (curr.size > 0) {
        updateTimeStoreInterval(this);
      }
      else {
        this[kSymbolIdentifier] = kUniqueNullValue;
      }
    }
  }

  protected refresh(identifier: TimeStoreIdentifier) {
    const curr = kLocalWeakTimeStore.get(this)!;
    if (!curr.has(identifier)) {
      return;
    }

    curr.set(identifier, Date.now());
    if (this[kSymbolIdentifier] === identifier) {
      this.#clearTimeout();
      updateTimeStoreInterval(this);
    }
  }

  protected clear() {
    this.#clearTimeout();
    this[kSymbolIdentifier] = kUniqueNullValue;
    kLocalWeakTimeStore.get(this)!.clear();
  }
}

function updateTimeStoreInterval(timestore: TimeStore): void {
  const curr = kLocalWeakTimeStore.get(timestore)!;

  timestore[kSymbolTimer] = null;
  timestore[kSymbolIdentifier] = kUniqueNullValue;

  if (curr.size === 0) {
    return;
  }

  // Sort elements by timestamp
  const sortedElements = [...curr.entries()].sort((left, right) => right[1] - left[1]);

  while (sortedElements.length > 0) {
    const [identifier, timestamp] = sortedElements.pop()!;
    const delta = Date.now() - timestamp;

    // If current key is expired
    if (delta >= timestore[kSymbolTTL]) {
      timestore.emit(TimeStore.Expired, identifier);
      continue;
    }

    // Schedule a new timer
    const timeOutMs = timestore[kSymbolTTL] - delta;

    timestore[kSymbolIdentifier] = identifier;
    timestore[kSymbolTimer] = setTimeout(() => {
      timestore.emit(TimeStore.Expired, identifier);
    }, timeOutMs).unref();
    break;
  }
}

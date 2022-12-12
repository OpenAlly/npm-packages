// Import Node.js Dependencies
import { EventEmitter } from "node:events";

// Import Third-party Dependencies
import {
  TimeStore,
  tSv,
  TSV_SYMBOL,

  tSvResponse,
  TimeStoreIdentifier,
  ITimeStoreConstructorOptions
} from "@openally/timestore";

// CONSTANTS
const kTimeStore = Symbol("TimeStore");

export class TimeMap<K extends TimeStoreIdentifier, V> extends Map<K, V> {
  static TTL = 1_000;
  public events: EventEmitter;
  public [kTimeStore]: TimeStore;

  constructor(
    iterable?: Iterable<readonly [K, V]>,
    options: Omit<ITimeStoreConstructorOptions, "eventEmitter"> = { ttl: TimeMap.TTL }
  ) {
    super(iterable);

    this.events = new EventEmitter();
    const timestore = new TimeStore({
      eventEmitter: this.events,
      ...options
    });
    timestore.on(TimeStore.Expired, (id) => {
      super.delete(id);
    });

    Object.defineProperty(this, kTimeStore, {
      value: timestore
    });
  }

  get ttl() {
    return this[kTimeStore].ttl;
  }

  clear() {
    this[kTimeStore].clear();
    super.clear();
  }

  delete(key: K) {
    this[kTimeStore].delete(key);
    const isDeleted = super.delete(key);

    return isDeleted;
  }

  set(key: K | tSvResponse<K>, value: V) {
    if (isTsvRespone<K>(key)) {
      this[kTimeStore].addTsv(key);

      return super.set(key.value, value);
    }
    this[kTimeStore].add(key);

    return super.set(key, value);
  }

  static set<K extends TimeStoreIdentifier, V>(
    obj: TimeMap<K, V> | Map<K, V>,
    pair: readonly [K, V],
    options?: ITimeStoreConstructorOptions
  ) {
    const [key, value] = pair;

    if (obj instanceof TimeMap) {
      obj.set(tSv(options)(key), value);
    }
    else {
      obj.set(key, value);
    }
  }
}

function isTsvRespone<T>(value: any): value is tSvResponse<T> {
  return value[TSV_SYMBOL];
}

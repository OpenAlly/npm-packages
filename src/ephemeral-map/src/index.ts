// Import Node.js Dependencies
import { EventEmitter } from "node:events";

// Import Third-party Dependencies
import {
  TimeStore,
  tSv,
  tSvResponse,
  TSV_SYMBOL,

  TimeStoreIdentifier,
  ITimeStoreConstructorOptions
} from "@openally/timestore";

// CONSTANTS
const kTimeStore = Symbol("TimeStore");

export { tSv, tSvResponse };

export default class EphemeralMap<K extends TimeStoreIdentifier, V> extends Map<K, V> {
  static Expired = TimeStore.Expired;
  static Renewed = TimeStore.Renewed;

  public events: EventEmitter;
  public [kTimeStore]: TimeStore;

  constructor(
    iterable?: Iterable<readonly [K, V]>,
    options: Omit<ITimeStoreConstructorOptions, "eventEmitter"> = {}
  ) {
    super();

    this.events = new EventEmitter();
    const timestore = new TimeStore(options);
    timestore.on(TimeStore.Expired, (id) => {
      this.events.emit(TimeStore.Expired, id, super.get(id));

      super.delete(id);
    });
    timestore.on(TimeStore.Renewed, (id) => this.events.emit(TimeStore.Renewed, id));

    Object.defineProperty(this, kTimeStore, {
      value: timestore
    });

    if (iterable) {
      for (const [key, value] of iterable) {
        this.set(key, value);
      }
    }
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
    obj: EphemeralMap<K, V> | Map<K, V>,
    pair: readonly [K, V],
    options?: ITimeStoreConstructorOptions
  ) {
    const [key, value] = pair;

    if (obj instanceof EphemeralMap) {
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

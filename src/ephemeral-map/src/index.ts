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

export interface IEphemeralMapOptions extends Omit<ITimeStoreConstructorOptions, "eventEmitter"> {
  refreshOnGet?: boolean;
}

export default class EphemeralMap<K extends TimeStoreIdentifier, V> extends EventEmitter {
  static Expired = TimeStore.Expired;
  static Renewed = TimeStore.Renewed;

  private data: Map<K, V> = new Map();
  private refreshOnGet: boolean;
  public [kTimeStore]: TimeStore;

  constructor(
    iterable?: Iterable<readonly [K, V]>,
    options: IEphemeralMapOptions = {}
  ) {
    super();
    const { refreshOnGet = false, ...timeStoreOptions } = options;

    this.refreshOnGet = refreshOnGet;
    const timestore = new TimeStore(timeStoreOptions);
    timestore.on(TimeStore.Expired, (id) => {
      this.emit(TimeStore.Expired, id, this.data.get(id));

      this.data.delete(id);
    });
    timestore.on(TimeStore.Renewed, (id) => this.emit(TimeStore.Renewed, id));

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

  get size() {
    return this.data.size;
  }

  keys() {
    return this.data.keys();
  }

  values() {
    return this.data.values();
  }

  entries() {
    return this.data.entries();
  }

  forEach(
    callback: (value: V, key: K, map: Map<K, V>) => void,
    thisArg?: any
  ) {
    const callbackFn = thisArg ? callback.bind(thisArg) : callback;
    for (const [key, value] of this.data) {
      callbackFn(value, key, this.data);
    }
  }

  [Symbol.iterator]() {
    return this.entries();
  }

  set(key: K | tSvResponse<K>, value: V) {
    if (isTsvResponse<K>(key)) {
      this[kTimeStore].addTsv(key);

      return this.data.set(key.value, value);
    }
    this[kTimeStore].add(key);

    return this.data.set(key, value);
  }

  has(key: K): boolean {
    return this.data.has(key);
  }

  get(key: K): V | undefined {
    if (this.refreshOnGet && this.has(key)) {
      this[kTimeStore].add(key);
    }

    return this.data.get(key);
  }

  delete(key: K): boolean {
    this[kTimeStore].delete(key);
    const isDeleted = this.data.delete(key);

    return isDeleted;
  }

  clear(): void {
    this[kTimeStore].clear();
    this.data.clear();
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

function isTsvResponse<T>(value: any): value is tSvResponse<T> {
  return value[TSV_SYMBOL];
}

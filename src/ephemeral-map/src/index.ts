// Import Node.js Dependencies
import { EventEmitter } from "node:events";

// Import Third-party Dependencies
import {
  TimeStore,
  tSv,
  type tSvResponse,
  TSV_SYMBOL,

  type TimeStoreIdentifier,
  type ITimeStoreConstructorOptions
} from "@openally/timestore";
import type { RequireAtLeastOne } from "type-fest";

// CONSTANTS
const INTERNAL_STORE = Symbol("TimeStore");

export { tSv, tSvResponse, INTERNAL_STORE };

export interface IEphemeralMapOptions extends Omit<ITimeStoreConstructorOptions, "eventEmitter"> {
  refreshOnGet?: boolean;
}

export type EmplaceHandler<K extends TimeStoreIdentifier, V> = RequireAtLeastOne<{
  insert: (key: K, map: EphemeralMap<K, V>) => V,
  update: (old: V, key: K, map: EphemeralMap<K, V>) => V
}>

export default class EphemeralMap<K extends TimeStoreIdentifier, V> extends EventEmitter {
  static Expired = TimeStore.Expired;
  static Renewed = TimeStore.Renewed;

  private data: Map<K, V> = new Map();
  private refreshOnGet: boolean;

  public [INTERNAL_STORE]: TimeStore;

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

    Object.defineProperty(this, INTERNAL_STORE, {
      value: timestore
    });

    if (iterable) {
      for (const [key, value] of iterable) {
        this.set(key, value);
      }
    }
  }

  get ttl() {
    return this[INTERNAL_STORE].ttl;
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
      this[INTERNAL_STORE].addTsv(key);

      return this.data.set(key.value, value);
    }
    this[INTERNAL_STORE].add(key);

    return this.data.set(key, value);
  }

  has(key: K): boolean {
    return this.data.has(key);
  }

  get(key: K): V | undefined {
    if (this.refreshOnGet && this.has(key)) {
      this[INTERNAL_STORE].add(key, { keepIdentifierBirthTTL: true });
    }

    return this.data.get(key);
  }

  delete(key: K): boolean {
    this[INTERNAL_STORE].delete(key);
    const isDeleted = this.data.delete(key);

    return isDeleted;
  }

  emplace(
    key: K, handler: EmplaceHandler<K, V>
  ): V | undefined {
    const oldValue = this.get(key);
    if (typeof oldValue !== "undefined" && handler.update) {
      const newValue = handler.update(oldValue, key, this);
      this.set(key, newValue);

      return newValue;
    }

    if (handler.insert) {
      const newValue = handler.insert(key, this);
      this.set(key, newValue);

      return newValue;
    }

    return void 0;
  }

  clear(): void {
    this[INTERNAL_STORE].clear();
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

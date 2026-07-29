// Import Internal Dependencies
import type {
  EventMap,
  TypedEventEmitter
} from "./types.ts";

type RawListener = ((...args: any[]) => void) & {
  listener?: (...args: any[]) => void;
};
type ListenerSlot = RawListener | RawListener[];

const kDefaultMaxListeners = 10;

export class Emitter<
  Events extends EventMap = Record<string | symbol, (...args: any[]) => void>
> implements TypedEventEmitter<Events> {
  #events: Record<string | symbol, ListenerSlot> = Object.create(null);
  #maxListeners = kDefaultMaxListeners;

  #addListener(
    event: string | symbol,
    listener: RawListener,
    prepend: boolean
  ): this {
    const existing = this.#events[event];

    if (existing === undefined) {
      this.#events[event] = listener;
    }
    else if (typeof existing === "function") {
      this.#events[event] = prepend ?
        [listener, existing] :
        [existing, listener];
    }
    else if (prepend) {
      existing.unshift(listener);
    }
    else {
      existing.push(listener);
    }

    if (this.#maxListeners > 0) {
      const count = this.listenerCount(event as keyof Events);
      if (count > this.#maxListeners) {
        console.warn(
          `[Emitter] Possible memory leak detected: ${count} listeners added for event "${String(event)}". ` +
          "Use setMaxListeners() to increase the limit."
        );
      }
    }

    return this;
  }

  #wrapOnce(
    event: string | symbol,
    listener: RawListener
  ): RawListener {
    const wrapped: RawListener = (...args: any[]) => {
      this.#removeListener(event, wrapped);
      listener(...args);
    };
    wrapped.listener = listener;

    return wrapped;
  }

  #removeListener(
    event: string | symbol,
    listener: RawListener
  ): void {
    const existing = this.#events[event];
    if (existing === undefined) {
      return;
    }

    if (typeof existing === "function") {
      if (
        existing === listener ||
        existing.listener === listener
      ) {
        delete this.#events[event];
      }

      return;
    }

    const index = existing.findIndex(
      (fn) => fn === listener || fn.listener === listener
    );
    if (index === -1) {
      return;
    }

    existing.splice(index, 1);
    if (existing.length === 0) {
      delete this.#events[event];
    }
    else if (existing.length === 1) {
      this.#events[event] = existing[0];
    }
  }

  addListener<E extends keyof Events>(
    event: E,
    listener: Events[E]
  ): this {
    return this.#addListener(
      event as string | symbol,
      listener as unknown as RawListener,
      false
    );
  }

  on<E extends keyof Events>(
    event: E,
    listener: Events[E]
  ): this {
    return this.addListener(event, listener);
  }

  once<E extends keyof Events>(
    event: E,
    listener: Events[E]
  ): this {
    const wrapped = this.#wrapOnce(
      event as string | symbol,
      listener as unknown as RawListener
    );

    return this.#addListener(
      event as string | symbol,
      wrapped,
      false
    );
  }

  prependListener<E extends keyof Events>(
    event: E,
    listener: Events[E]
  ): this {
    return this.#addListener(
      event as string | symbol,
      listener as unknown as RawListener,
      true
    );
  }

  prependOnceListener<E extends keyof Events>(
    event: E,
    listener: Events[E]
  ): this {
    const wrapped = this.#wrapOnce(
      event as string | symbol,
      listener as unknown as RawListener
    );

    return this.#addListener(
      event as string | symbol,
      wrapped,
      true
    );
  }

  off<E extends keyof Events>(
    event: E,
    listener: Events[E]
  ): this {
    return this.removeListener(event, listener);
  }

  removeListener<E extends keyof Events>(
    event: E,
    listener: Events[E]
  ): this {
    this.#removeListener(
      event as string | symbol,
      listener as unknown as RawListener
    );

    return this;
  }

  removeAllListeners<E extends keyof Events>(
    event?: E
  ): this {
    if (event === undefined) {
      this.#events = Object.create(null);
    }
    else {
      delete this.#events[event as string | symbol];
    }

    return this;
  }

  emit<E extends keyof Events>(
    event: E,
    ...args: Parameters<Events[E]>
  ): boolean {
    const existing = this.#events[event as string | symbol];
    if (existing === undefined) {
      return false;
    }

    if (typeof existing === "function") {
      existing(...args);
    }
    else {
      const listeners = existing.slice();
      for (let i = 0; i < listeners.length; i++) {
        listeners[i](...args);
      }
    }

    return true;
  }

  eventNames(): (keyof Events | string | symbol)[] {
    return Reflect.ownKeys(this.#events);
  }

  rawListeners<E extends keyof Events>(
    event: E
  ): Events[E][] {
    const existing = this.#events[event as string | symbol];
    if (existing === undefined) {
      return [];
    }

    return (
      typeof existing === "function" ? [existing] : existing.slice()
    ) as Events[E][];
  }

  listeners<E extends keyof Events>(
    event: E
  ): Events[E][] {
    const existing = this.#events[event as string | symbol];
    if (existing === undefined) {
      return [];
    }

    const slots = typeof existing === "function" ? [existing] : existing;

    return slots.map((fn) => fn.listener ?? fn) as Events[E][];
  }

  listenerCount<E extends keyof Events>(
    event: E
  ): number {
    const existing = this.#events[event as string | symbol];
    if (existing === undefined) {
      return 0;
    }

    return typeof existing === "function" ? 1 : existing.length;
  }

  getMaxListeners(): number {
    return this.#maxListeners;
  }

  setMaxListeners(
    maxListeners: number
  ): this {
    this.#maxListeners = maxListeners;

    return this;
  }
}

<p align="center"><h1 align="center">
  Emitt
</h1>

<p align="center">
  Type-safe EventEmitter for Node.js and Browser
</p>

`Emitter<Events>` is a drop-in-shaped `EventEmitter` with no dependency on Node's `events` module or the DOM `EventTarget`: it runs unmodified in Node.js and the browser, and every method is typed against your own `Events` map instead of `any[]`.

## Requirements
- [Node.js](https://nodejs.org/en/) v24 or higher

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i @openally/emitt
# or
$ yarn add @openally/emitt
```

## Usage example

```ts
import { Emitter } from "@openally/emitt";

interface MyEvents {
  connect: (host: string) => void;
  [key: symbol]: (payload: unknown) => void;
}

const emitter = new Emitter<MyEvents>();

emitter.on("connect", (host) => {
  console.log(`connected to ${host}`);
});

emitter.emit("connect", "localhost");
```

`Events` defaults to an untyped `string | symbol` event map when omitted:

```ts
type EventMap = Record<string | symbol, (...args: any[]) => void>;
```

## Table of contents
- [Emitter API](#emitter-api)
  - [Constructor](#constructor)
  - [addListener, on](#addlistener-on)
  - [once](#once)
  - [prependListener](#prependlistener)
  - [prependOnceListener](#prependoncelistener)
  - [off, removeListener](#off-removelistener)
  - [removeAllListeners](#removealllisteners)
  - [emit](#emit)
  - [eventNames](#eventnames)
  - [rawListeners](#rawlisteners)
  - [listeners](#listeners)
  - [listenerCount](#listenercount)
  - [getMaxListeners, setMaxListeners](#getmaxlisteners-setmaxlisteners)
- [Helpers](#helpers)
  - [once (helper)](#once-helper)
  - [on (helper)](#on-helper)
  - [addAbortListener](#addabortlistener)

## Emitter API

### Constructor
```ts
class Emitter<Events extends EventMap = Record<string | symbol, (...args: any[]) => void>> {
  constructor();
}
```
Both `string` and `symbol` keys are supported for event names.

```ts
const emitter = new Emitter<MyEvents>();
```

### addListener, on
```ts
addListener<E extends keyof Events>(event: E, listener: Events[E]): this;
on<E extends keyof Events>(event: E, listener: Events[E]): this;
```
Register a listener for `event`. `on` is an alias of `addListener`. Warns via `console.warn` once the listener count for that event exceeds `getMaxListeners()` (see [getMaxListeners, setMaxListeners](#getmaxlisteners-setmaxlisteners)).

```ts
emitter.on("connect", (host) => console.log(host));
```

### once
```ts
once<E extends keyof Events>(event: E, listener: Events[E]): this;
```
Register a listener that is automatically removed after firing a single time.

```ts
emitter.once("connect", (host) => console.log(host));

emitter.emit("connect", "localhost"); // logs "localhost"
emitter.emit("connect", "localhost"); // listener already removed, does nothing
```

### prependListener
```ts
prependListener<E extends keyof Events>(event: E, listener: Events[E]): this;
```
Same as `on`, but inserts the listener at the beginning of the list instead of the end.

```ts
emitter.on("bar", () => order.push("second"));
emitter.prependListener("bar", () => order.push("first"));

emitter.emit("bar"); // order === ["first", "second"]
```

### prependOnceListener
```ts
prependOnceListener<E extends keyof Events>(event: E, listener: Events[E]): this;
```
Combines `prependListener` and `once`: runs first, and only once.

### off, removeListener
```ts
off<E extends keyof Events>(event: E, listener: Events[E]): this;
removeListener<E extends keyof Events>(event: E, listener: Events[E]): this;
```
Remove a previously registered listener. `off` is an alias of `removeListener`. Works with the original function reference even when it was registered via `once`/`prependOnceListener`.

```ts
function listener(host: string) {
  console.log(host);
}

emitter.on("connect", listener);
emitter.off("connect", listener);
```

### removeAllListeners
```ts
removeAllListeners<E extends keyof Events>(event?: E): this;
```
Remove every listener for `event`, or every listener for every event when called without an argument.

```ts
emitter.removeAllListeners("connect");
emitter.removeAllListeners(); // clears everything
```

### emit
```ts
emit<E extends keyof Events>(event: E, ...args: Parameters<Events[E]>): boolean;
```
Synchronously call every listener registered for `event` with the given arguments, in registration order. Returns `true` if there was at least one listener, `false` otherwise.

```ts
emitter.emit("connect", "localhost"); // true
emitter.emit("unknown-event"); // false, no listeners
```

### eventNames
```ts
eventNames(): (keyof Events | string | symbol)[];
```
List the event names (`string` and `symbol`) that currently have at least one listener.

```ts
emitter.eventNames(); // ["connect", Symbol(baz)]
```

### rawListeners
```ts
rawListeners<E extends keyof Events>(event: E): Events[E][];
```
Same as `listeners`, but returns the internal wrapper function for listeners registered via `once`/`prependOnceListener` instead of the original function reference.

### listeners
```ts
listeners<E extends keyof Events>(event: E): Events[E][];
```
Return a copy of the listeners registered for `event`, unwrapping `once` listeners back to the original function passed in.

```ts
emitter.once("connect", listener);
emitter.listeners("connect"); // [listener]
```

### listenerCount
```ts
listenerCount<E extends keyof Events>(event: E): number;
```
Number of listeners currently registered for `event`.

### getMaxListeners, setMaxListeners
```ts
getMaxListeners(): number;
setMaxListeners(maxListeners: number): this;
```
Get/set the listener-count threshold that triggers the memory-leak warning (default `10`, matching Node's `EventEmitter`). Pass `0` to disable the warning.

```ts
emitter.setMaxListeners(0); // disable the warning
```

## Helpers

Standalone helpers inspired by Node's [`events`](https://nodejs.org/api/events.html) module, typed against a given `Emitter<Events>` instance (resolved argument/tuple types instead of Node's `any[]`).

```ts
import { Emitter, once, on, addAbortListener } from "@openally/emitt";
```

### once (helper)
```ts
function once<Events extends EventMap, E extends keyof Events>(
  emitter: Emitter<Events>,
  event: E,
  options?: AbortOptions
): Promise<Parameters<Events[E]>>;
```
Resolve with the typed argument tuple of the next matching `emit()`.

```ts
const [host] = await once(emitter, "connect");
```

Accepts an `{ signal }` option (`AbortOptions`) to cancel waiting via an `AbortSignal`; rejects with the signal's `reason` (or a generic abort `Error`) when aborted, and always removes its internal listener on cleanup/rejection.

### on (helper)
```ts
function on<Events extends EventMap, E extends keyof Events>(
  emitter: Emitter<Events>,
  event: E,
  options?: AbortOptions
): AsyncGenerator<Parameters<Events[E]>, void, void>;
```
Async-iterate every occurrence of `event`, queuing emissions that happen faster than they are consumed.

```ts
for await (const [host] of on(emitter, "connect")) {
  console.log(host);
}
```

Same `{ signal }` option as `once`; throws with the signal's `reason` (or a generic abort `Error`) when aborted, and always removes its internal listener when the loop exits.

### addAbortListener
```ts
function addAbortListener(signal: AbortSignal, listener: (event: Event) => void): Disposable;
```
Independent of `Emitter` — listens once for `signal`'s `abort` event (firing immediately via `queueMicrotask` if already aborted) and returns a `Disposable`, so it works with `using`.

```ts
function example(signal: AbortSignal) {
  using _ = addAbortListener(signal, () => {
    // cleanup
  });
}
```

## License
MIT

<p align="center"><h1 align="center">
  TimeStore
</h1>

<p align="center">
  An abstract class designed to manage the Time To Live (TTL) of a given list of identifiers. This implementation can be combined with other structures to allow your keys or values to expire after a certain time.
</p>

<p align="center">
  <a href="https://github.com/OpenAlly/npm-packages/tree/main/src/timestore">
    <img src="https://img.shields.io/bundlephobia/min/@openally/timestore?style=for-the-badge" alt="size">
  </a>
  <a href="https://github.com/OpenAlly/npm-packages/tree/main/src/timestore">
    <img src="https://img.shields.io/npm/dw/@openally/timestore?style=for-the-badge" alt="download">
  </a>
  <a href="https://github.com/OpenAlly/npm-packages/tree/main/src/timestore">
    <img src="https://img.shields.io/github/actions/workflow/status/OpenAlly/npm-packages/timestore.yml?style=for-the-badge">
  </a>
</p>

> **Warning** Internally it uses a Node.js timer. This library does not guarantee that the timers doesn't drift.

## Requirements
- [Node.js](https://nodejs.org/en/) v16 or higher

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i @openally/timestore
# or
$ yarn add @openally/timestore
```

## Usage example

```ts
import { TimeStore } from "@openally/timestore";

const store = new TimeStore({ ttl: 10_000 })
  .add("foo")
  .add("bar", { ttl: 500 })
  .add("bar", { ttl: 200, keepIdentifierBirthTTL: true }); // will be ignored!

console.log(store.ttl); // 10000

store.on(
  TimeStore.Expired,
  (id) => console.log(`identifier '${id}' has expired!`)
);
```

> **Warning** By default the internal timer we use in unreferenced to allow the event loop to properly stop.
>
> You can modify this behaviour by enabling the `keepEventLoopAlive` options.

## API

Identifier are often described with the following type:
```ts
export type TimeStoreIdentifier = string | symbol | number | boolean | bigint | object | null;
```

### constructor(options?: ITimeStoreConstructorOptions)
The constructor `options` payload is described by the following TS interface:

```ts
interface ITimeStoreConstructorOptions {
  /**
   * Time To Live (Lifetime of stored identifiers).
   */
  ttl?: number;
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
```

If the `ttl` option is not provided all identifiers will remain active. The default class `ttl` will be equal **zero**.

### add(identifier: TimeStoreIdentifier, options?: ITimeStoreAddOptions): this
The `options` payload is described by the following TS interface:

```ts
interface ITimeStoreAddOptions {
  /**
   * Time To Live for the given identifier.
   * If no value provided it will take the class TTL value.
   */
  ttl?: number;

  /**
   * If identifier exist then keep is original timestamp and ttl.
   *
   * @default false
   */
  keepIdentifierBirthTTL?: boolean;
}
```

> **Note** Adding an existing ID will reset its previous TTL/timestamp except if the `keepIdentifierBirthTTL` option is set to **true**.

### addTsv(data: tSvResponse): this
Add a value using a TimeStoreValue:

```ts
import { TimeStore, tSv } from "@openally/timestore";

const tSvFactory = tSv({ ttl: 500 });

const store = new TimeStore({ ttl: 10_000 })
  .addTsv(tSvFactory("key"))
  .addTsv(tSvFactory(["key", "value"])); // value will be ignored here
```

TimeStoreValue are useful to build higher abstraction using TimeStore. Those values all embed a Global symbol `Symbol.for("TimeStoreValue")`.

The module also export it as `TSV_SYMBOL`.

### delete(identifier: TimeStoreIdentifier): this
Remove a given identifier from the store.

### clear(): this
Calling this method will remove all stored identifiers and clear the internal Node.js Timeout. The instance basically returns to its initial state.

### get ttl(): number
Read-only TTL. Return `0` if the class has no ttl.

### get size(): number
Read-only store size.

### has(): boolean
Return `true` if the key exists in the store otherwise it will return `false`.

## Events

The TimeStore class broadcast two distinct events:

- TimeStore.Expired (**when a given identifier expire**)
- TimeStore.Renewed (**when an identifier TTL is Renewed with add() method**)

> **Warning** Both value are Symbols

## License
MIT

<p align="center"><h1 align="center">
  EphemeralMap
</h1>

<p align="center">
  ES6 Map-Like implementation with keys that have a defined timelife (using <a href="https://github.com/OpenAlly/npm-packages/tree/main/src/timestore">TimeStore</a> under the hood)
</p>

## Requirements
- [Node.js](https://nodejs.org/en/) v16 or higher

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i @openally/ephemeral-map
# or
$ yarn add @openally/ephemeral-map
```

## Usage example

```ts
import EphemeralMap, { tSv } from "@openally/ephemeral-map";

const data = [
  ["hello", "world"]
];

// Note: ttl is not mandatory
const em = new EphemeralMap(data, { ttl: 500 });
em.on(EphemeralMap.Expired, (key, value) => {
  console.log(`Identifier '${key}' with value '${value}' has expired!`);
});

em.set(tSv({ ttl: 200 })("key"), "value");
```

## API
EphemeralMap extend from a normal Map. By default the inner TimeStore set his ttl to 0 (which mean that no keys expire). 

### get ttl(): number
Read-only TTL. Return `0` if the class has no ttl.

### emplace(key, handler)
Method inspired from [the TC39 proposal](https://github.com/tc39/proposal-upsert) to add an upsert method on Map.

### static set

Add a pair (key, value) to a Map or EphemeralMap.
If the first argument is a Map then the third argument is ignored.

```ts
const em = new EphemeralMap();

EphemeralMap.set(em, ["foo", "bar"], {
  ttl: 400
});
```

## Events

The EphemeralMap EventEmitter broadcast two distinct events:

- EphemeralMap.Expired (**when a given identifier expire**)
- EphemeralMap.Renewed (**when an identifier TTL is Renewed with add() method**)

> **Warning** Both value are Symbols

## License
MIT

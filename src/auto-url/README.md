<p align="center"><h1 align="center">
  Auto-URL
</h1>

<p align="center">
  Utility to quickly build WHATWG URL from an Object payload (with custom transformation supported)
</p>

## Requirements
- [Node.js](https://nodejs.org/en/) v24 or higher

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i @openally/auto-url
# or
$ yarn add @openally/auto-url
```

## Usage example

```ts
import autoURL from "@openally/auto-url";

const myURL = autoURL(
  "https://www.google.fr",
  { foo: "bar" },
  { foo: (value) => value.toUpperCase() }
);

// https://google.fr/?foo=BAR
console.log(myURL.href);
```

## API

```ts
export type autoURLTransformCallback = (value: string) => string;
export type autoURLTransformConfig<T extends string> = Record<T, autoURLTransformCallback>;

function autoURL<T extends string>(
  source: string | URL,
  payload?: Record<T, any> | Iterable<[T, any]>,
  transformersConfig: autoURLTransformConfig<T>
): URL
```

## License
MIT

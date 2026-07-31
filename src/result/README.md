<p align="center"><h1 align="center">
  Result
</h1>

<p align="center">
  Another Rust's <code>Result</code> (and <code>Option</code>) implementation for TypeScript, inspired by the unmaintained <a href="https://github.com/vultix/ts-results">ts-results</a> and the API of <a href="https://github.com/supermacro/neverthrow">neverthrow</a>.
</p>

`Result<T, E>` lets you encode functions that may fail without throwing: it forces callers to explicitly handle both the success (`Ok<T>`) and failure (`Err<E>`) cases instead of relying on `try/catch`. `Option<T>` does the same for values that may or may not be present (`Some<T>` / `None`), avoiding `null`/`undefined` checks scattered across the codebase.

## Requirements
- [Node.js](https://nodejs.org/en/) v24 or higher

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i @openally/result
# or
$ yarn add @openally/result
```

## Usage example

```ts
import fs from "node:fs";
import {
  Ok, Err, Option, wrap, type Result
} from "@openally/result";

interface Config {
  host: string;
  port: number;
}

function readConfigFile(
  path: string
): Result<string, string> {
  return fs.existsSync(path) ?
    Ok(fs.readFileSync(path, "utf8")) :
    Err(`config file not found at "${path}"`);
}

function parseJSON(
  raw: string
): Result<Record<string, unknown>, string> {
  return wrap<Record<string, unknown>, Error>(() => JSON.parse(raw))
    .mapErr((error) => `invalid JSON: ${error.message}`);
}

function toConfig(
  record: Record<string, unknown>
): Result<Config, string> {
  const { host, port } = record;

  return typeof host === "string" && typeof port === "number" ?
    Ok({ host, port }) :
    Err("config must have a string `host` and a numeric `port`");
}

function configFromEnv(): Result<Config, string> {
  return Option.from(process.env.HOST)
    .andThen((host) => {
      return Option.from(process.env.PORT)
        .map((port) => ({ host, port: Number(port) }));
    })
    .toResult("no config file and no HOST/PORT environment variables set");
}

function loadConfig(path: string): Result<Config, string> {
  return readConfigFile(path)
    .andThen(parseJSON)
    .andTee((record) => console.log("loaded raw config:", record))
    .andThen(toConfig)
    .orElse(() => configFromEnv());
}

loadConfig("config.json").match(
  (config) => console.log(`ready on ${config.host}:${config.port}`),
  (error) => {
    console.error(`failed to load config: ${error}`);
    process.exit(1);
  }
);
```

## Table of contents
- [Result API](#result-api)
  - [Constructors: Ok, Err](#constructors-ok-err)
  - [isOk, isErr](#isok-iserr)
  - [unwrap](#unwrap)
  - [unwrapOr](#unwrapor)
  - [unwrapOrElse](#unwraporelse)
  - [safeUnwrap](#safeunwrap)
  - [map](#map)
  - [mapErr](#maperr)
  - [mapOr](#mapor)
  - [mapOrElse](#maporelse)
  - [andThen](#andthen)
  - [orElse](#orelse)
  - [andTee](#andtee)
  - [orTee](#ortee)
  - [andThrough](#andthrough)
  - [match](#match)
  - [stack (Err only)](#stack-err-only)
- [Option API](#option-api)
  - [Constructors: Some, None](#constructors-some-none)
  - [Option.from](#optionfrom)
  - [unwrap, unwrapOr, unwrapOrElse, safeUnwrap, expect](#unwrap-unwrapor-unwraporelse-safeunwrap-expect)
  - [map, mapOr, mapOrElse](#map-mapor-maporelse)
  - [andThen](#andthen-1)
  - [toResult](#toresult)
- [Utilities](#utilities)
  - [wrap](#wrap)
  - [wrapAsync](#wrapasync)
  - [isResult](#isresult)
  - [combine](#combine)
  - [combineWithAllErrors](#combinewithallerrors)

## Result API

### Constructors: Ok, Err
```ts
function Ok<T>(value: T): OkImpl<T>;
function Err<E>(error: E): ErrImpl<E>;
```
Build a successful (`Ok`) or failed (`Err`) `Result`.

```ts
const good = Ok(1);
const bad = Err("oops");
```

### isOk, isErr
```ts
isOk(): boolean;
isErr(): boolean;
```
Narrow a `Result<T, E>` to its `Ok` or `Err` variant. Equivalent to reading the `.ok`/`.err` boolean properties directly, provided for API parity/readability in conditionals.

```ts
const result = Ok(1);

result.isOk(); // true
result.isErr(); // false
```

### unwrap
Get the value if `Ok`, throw if `Err`.

```ts
Ok(1).unwrap(); // 1
Err("oops").unwrap(); // Error: Tried to unwrap Error: oops
```

### unwrapOr
Get the value if `Ok`, fallback to a default value if `Err` (instead of throwing).

```ts
Ok(1).unwrapOr(5); // 1
Err("oops").unwrapOr(5); // 5
```

### unwrapOrElse
Same as `unwrapOr` but using a lazy function for the default value.

```ts
Ok(1).unwrapOrElse(() => 5); // 1
Err("oops").unwrapOrElse(() => 5); // 5
```

### safeUnwrap
Same as `unwrap` but only available on `Ok` (useful for type narrowing when you already know the `Result` is `Ok`).

### map
Map the value for `Ok`. Does nothing on `Err` (use `mapErr` instead).

```ts
Ok(1)
  .map((v) => v + 1)
  .unwrap(); // 2
```

### mapErr
Map the value for `Err`. Does nothing on `Ok` (use `map` instead).

```ts
Err(new Error("oops"))
  .mapErr((cause) => new Error("oh no", { cause }))
  .unwrap();
```

### mapOr
Map and unwrap in one step:
- Use the default value for `Err`
- Use the mapper for `Ok`

```ts
Ok(1)
  .mapOr(1, (val) => val * 2); // 2

Err(new Error("oops"))
  .mapOr(1, (val) => val * 2); // 1
```

### mapOrElse
Same as `mapOr` but uses a callback (fed with the error) for the default value.

```ts
Err(new Error("oops"))
  .mapOrElse(
    (err) => err.message,
    (val) => val * 2
  ); // oops
```

### andThen
Similar to `Promise.then`, chain a `Result`-returning computation on the `Ok` value. Short-circuits on `Err`.

```ts
Ok(1)
  .andThen((value) => Ok(value + 1))
  .unwrap(); // 2
```

This can also be used to turn an `Ok` into an `Err`.

### orElse
The error-side counterpart of `andThen`: recover from an `Err` by returning a new `Result`. Does nothing on `Ok`.

```ts
Err("oops")
  .orElse(() => Ok(5))
  .unwrap(); // 5

Ok(1)
  .orElse(() => Ok(5))
  .unwrap(); // 1 (untouched)
```

### andTee
Run a side effect (e.g. logging) on the `Ok` value without changing the `Result`. Does nothing on `Err`.

```ts
Ok(1)
  .andTee((val) => console.log(`got ${val}`))
  .unwrap(); // 1, and logs "got 1"
```

### orTee
The `Err` counterpart of `andTee`: run a side effect on the error without changing the `Result`. Does nothing on `Ok`.

```ts
Err("oops")
  .orTee((err) => console.error(err)); // logs "oops", Result untouched
```

### andThrough
Run a `Result`-returning validation on the `Ok` value, keeping the original `Ok` value if the validation succeeds, or propagating the new `Err` if it fails.

```ts
Ok(1)
  .andThrough((val) => val > 0 ? Ok(val) : Err("must be positive"))
  .unwrap(); // 1
```

### match
Handle both the `Ok` and `Err` cases with dedicated callbacks and return a single value — no need to branch on `.ok`/`.err` yourself.

```ts
const message = readFile("test.txt").match(
  (content) => `read ${content.length} bytes`,
  (error) => `failed: ${error}`
);
```

### stack (Err only)
Return the `Err` stack trace (captured at creation time, not available on `Ok`).

```ts
const _e = Err(new Error());
console.log(_e.stack);
```

## Option API

### Constructors: Some, None
```ts
function Some<T>(value: T): SomeImpl<T>;
const None: NoneImpl;
```

```ts
const present = Some(1);
const absent = None;
```

### Option.from
Collapse a value that may be `null`/`undefined` into an `Option`, without needing to import a separate utility.

```ts
function Option.from<T>(val: T | null | undefined): Option<NonNullable<T>>;
```

```ts
Option.from(5); // Some(5)
Option.from(null); // None
Option.from(undefined); // None
```

### unwrap, unwrapOr, unwrapOrElse, safeUnwrap, expect
Same semantics as their `Result` counterparts, but for presence/absence instead of success/failure. `expect(msg)` is an alias of `unwrap()` (kept for Rust-API familiarity).

```ts
Some(1).unwrap(); // 1
None.unwrap(); // Error: Tried to unwrap None
None.unwrapOr(5); // 5
None.unwrapOrElse(() => 5); // 5
```

### map, mapOr, mapOrElse
Same semantics as their `Result` counterparts.

```ts
Some(1).map((v) => v + 1).unwrap(); // 2
None.mapOr(0, (v) => v + 1); // 0
```

### andThen
Chain an `Option`-returning computation on the value. Short-circuits on `None`.

```ts
Some(1).andThen((v) => (v > 0 ? Some(v) : None));
```

### toResult
Convert an `Option<T>` into a `Result<T, E>`, using the given error value when `None`.

```ts
Some(1).toResult("missing"); // Ok(1)
None.toResult("missing"); // Err("missing")
```

## Utilities

### wrap
Wrap an operation that may throw (`try/catch` style) into a `Result`.

```ts
function wrap<T, E = unknown>(op: () => T): Result<T, E>;
```

```ts
const result = wrap(() => JSON.parse(input));
```

### wrapAsync
Same as `wrap` but for an async operation, resolving to `Promise<Result<T, E>>`.

```ts
function wrapAsync<T, E = unknown>(op: () => Promise<T>): Promise<Result<T, E>>;
```

```ts
const result = await wrapAsync(() => fetch(url).then((r) => r.json()));
```

### isResult
Type guard checking whether a value is a `Result` (either `Ok` or `Err`).

```ts
function isResult<T = any, E = any>(val: unknown): val is Result<T, E>;
```

### combine
Combine a tuple/array of `Result`s into a single `Result`. Short-circuits on the first `Err` encountered; the resulting `Ok` value preserves each input's type at its tuple position.

```ts
function combine<T extends readonly Result<any, any>[]>(
  results: T
): Result<{ [K in keyof T]: InferOkTypes<T[K]> }, InferErrTypes<T[number]>>;
```

```ts
combine([Ok(1), Ok("foo"), Ok(true)]); // Ok([1, "foo", true])
combine([Ok(1), Err("oops"), Err("never reached")]); // Err("oops")
```

### combineWithAllErrors
Same as `combine`, but collects every encountered `Err` instead of short-circuiting on the first one.

```ts
function combineWithAllErrors<T extends readonly Result<any, any>[]>(
  results: T
): Result<{ [K in keyof T]: InferOkTypes<T[K]> }, InferErrTypes<T[number]>[]>;
```

```ts
combineWithAllErrors([Ok(1), Err("first"), Err("second")]); // Err(["first", "second"])
```

## License
MIT

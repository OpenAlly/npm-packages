<p align="center"><h1 align="center">
  Result
</h1>

<p align="center">
  [WIP] Another Rust's Result implementation (inspired by <a href="https://github.com/vultix/ts-results">ts-results</a>)
</p>

## Requirements
- [Node.js](https://nodejs.org/en/) v16 or higher

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
import { Result, Ok, Err } from "@openally/result";

function readFile(path: string): Result<string, "invalid path"> {
  if (existsSync(path)) {
    return Ok(fs.readFileSync(path, "utf8"));
  }

  return Err("invalid path");
}

const fileContentStr = readFile("test.txt").unwrap();
console.log(fileContentStr);
```

## API

### unwrap()
Unwrap value (throw if error).

```ts
Ok(1).unwrap(); // 1
Err("oops").unwrap(); // Error: Tried to unwrap Error: oops
```

### unwrapOr(value)
Unwrap with a default value (if an error is detected).

```ts
Ok(1).unwrapOr(5); // 1
Err("oops").unwrapOr(5); // 5
```

### map()
Map for an Ok value.

```ts
Ok(1)
  .map((v) => v + 1)
  .unwrap(); // 2
```

### mapErr()
Map for an Error value.

### andThen()

```ts
Ok(1)
  .andThen((value) => Ok(value + 1))
  .unwrap(); // 2
```

## License
MIT

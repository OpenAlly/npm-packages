<p align="center"><h1 align="center">
  Result
</h1>

<p align="center">
  Another Rust's Result implementation (inspired by <a href="https://github.com/vultix/ts-results">ts-results</a>)
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

Where Result could be either an Ok or Err

```ts
type Result<T, E> = OkImpl<T> | ErrImpl<E>;
```

---

You can combine that package with [ts-pattern](https://github.com/gvergnaud/ts-pattern#readme), here is an example;

```ts
return match(constraint.type)
  .with("PRIMARY KEY", () => (
    column.isPrimary ? None : Some({ columnName, type: "MISSING PK" })
  ))
  .with("UNIQUE", () => helper
    .getUniqueByColumnName(columnName)
    .unwrapOr(Some({ columnName, type: "MISSING UNIQUE" }))
  )
  .with("FOREIGN KEY", () => helper
    .getForeignKeyByColumnName(columnName)
    .andThen((fk) => {
      return helper.fkIsMatchingConstraint(fk, constraint) ?
        Some({ columnName, type: "INVALID FK REFERENCE", constraint }) :
        None;
    })
    .unwrapOr(Some({ columnName, type: "MISSING FK" }))
  )
  .otherwise(() => None) as Option<IConstraintDifference>;
```

Where Option is defined as being Some value or None.

```ts
type Option<T> = SomeImpl<T> | None
```

## API

### unwrap
Get value if Ok but throw if Err.

```ts
Ok(1).unwrap(); // 1
Err("oops").unwrap(); // Error: Tried to unwrap Error: oops
```

### unwrapOr
Get value if Ok but fallback to a default value if Err (instead of throwing an Error).

```ts
Ok(1).unwrapOr(5); // 1
Err("oops").unwrapOr(5); // 5
```

### unwrapOrElse
Same as `unwrapOr` but use a lazy function for the default value.

```ts
Ok(1).unwrapOrElse(() => 5); // 1
Err("oops").unwrapOrElse(() => 5); // 5
```

### safeUnwrap
Same as `unwrap` but only available for Ok (useful for type safety).

### map
Map value for Ok. Do nothing with Err (use `mapErr` instead).

```ts
Ok(1)
  .map((v) => v + 1)
  .unwrap(); // 2
```

### mapOr
Map and unwrap:
- Use default value for Error
- Use mapper for Ok

```ts
Ok(1)
  .mapOr(1, (val) => val * 2); // 2

Err(new Error("oops"))
  .mapOr(1, (val) => val * 2); // 1
```

### mapOrElse
Same as `mapOr` but use a callback returning error for default value

```ts
Err(new Error("oops"))
  .mapOrElse(
    (err) => err.message),
    (val) => val * 2
  ); // oops
```

### mapErr
Map value for Err. Do nothing with Ok (use `map` instead).

```ts
Err(new Error("oops"))
  .mapErr((cause) => new Error("oh no", { cause }))
  .unwrap();
```

### andThen
Similar to Promise.then, map and transform an Ok value.

```ts
Ok(1)
  .andThen((value) => Ok(value + 1))
  .unwrap(); // 2
```

This could be used to transform an Ok to an Err.

### stack
Return the Err stacktrace (not available for Ok).

```ts
const _e = Err(new Error());
console.log(_e.stack);
```

## License
MIT

// Import Internal Dependencies
import { Ok, OkImpl } from "./class/Ok.class.ts";
import { Err, ErrImpl } from "./class/Err.class.ts";

export { Option, Some } from "./class/Some.class.ts";
export { None } from "./class/None.class.ts";
export { Ok, Err };

export type { Result } from "./types.ts";
import type { Result, CombineResults, CombineResultsWithAllErrors } from "./types.ts";

/**
 * Wrap an operation that may throw an Error (`try-catch` style) into checked exception style
 * @param op The operation function
 */
export function wrap<T, E = unknown>(op: () => T): Result<T, E> {
  try {
    return new OkImpl(op());
  }
  catch (e) {
    return new ErrImpl<E>(e as E);
  }
}

/**
 * Wrap an async operation that may throw an Error (`try-catch` style) into checked exception style
 * @param op The operation function
 */
export async function wrapAsync<T, E = unknown>(
  op: () => Promise<T>
): Promise<Result<T, E>> {
  try {
    const val = await op();

    return new OkImpl(val);
  }
  catch (e) {
    return new ErrImpl<E>(e as E);
  }
}

export function isResult<T = any, E = any>(
  val: unknown
): val is Result<T, E> {
  return val instanceof ErrImpl || val instanceof OkImpl;
}

/**
 * Combine a tuple/array of Results into a single Result.
 * Short-circuits on the first encountered Err.
 */
export function combine<const T extends readonly Result<any, any>[]>(
  results: T
): CombineResults<T> {
  const values: unknown[] = [];

  for (const result of results) {
    if (result.err) {
      return result;
    }
    values.push(result.val);
  }

  return Ok(values) as CombineResults<T>;
}

/**
 * Combine a tuple/array of Results into a single Result, collecting every Err
 * instead of short-circuiting on the first one.
 */
export function combineWithAllErrors<const T extends readonly Result<any, any>[]>(
  results: T
): CombineResultsWithAllErrors<T> {
  const values: unknown[] = [];
  const errors: unknown[] = [];

  for (const result of results) {
    if (result.err) {
      errors.push(result.val);
    }
    else {
      values.push(result.val);
    }
  }

  return (
    errors.length > 0 ? Err(errors) : Ok(values)
  ) as CombineResultsWithAllErrors<T>;
}
